import {CallbackService, Objects, VK} from "vk-io";
import {
  DirectAuthorization,
  officialAppCredentials,
} from "@vk-io/authorization";
import readlineSync from "readline-sync";
import {Command} from "commander";
import {Storage} from "./storage";
import CaptchaResolver from "rucaptcha-api";

export const filterReg = (name: string, searchTxt?: string) => {
  const formatSearch = searchTxt?.trim();

  if (!formatSearch) return true;
  return formatSearch && new RegExp(formatSearch, "gi").test(name);
};

// colors
// const Reset = "\x1b[0m",
//   FgGreen = "\x1b[32m";

interface Options {
  sourceUser?: string;
  targetUser?: string;
  exclude?: string;
  include?: string;
}

const apiVersion = "5.154";

const loginUser = async (
  data: {token: string; user: number},
  arg?: string,
  name?: string,
) => {
  if (!data) {
    let password: string;
    let login: string;
    if (arg) {
      const logPass = arg?.split(":");
      if (logPass.length === 2) {
        [login, password] = logPass;
      } else {
        const user = await new VK({token: arg, apiVersion}).api.account
          .getProfileInfo({})
          .then(({id}) => id);
        return {token: arg, user};
      }
    } else {
      console.log(`auth ${name}`);
      login = readlineSync.question("login:").trim();
      password = readlineSync.question("password:").trim();
    }
    const callbackService = new CallbackService();
    callbackService.onTwoFactor(async ({phoneMask, type}, retry) => {
      console.log(`send two-factor code type:${type} phone:${phoneMask}`);
      await retry(readlineSync.question("code:").trim());
    });
    callbackService.onCaptcha(async (data, retry) => {
      console.log(`send captcha`, data);
      await retry(readlineSync.question("captcha code:").trim());
    });

    const direct = new DirectAuthorization({
      callbackService,
      ...officialAppCredentials.android,
      scope: "all",
      login,
      password,
      apiVersion,
    });
    console.log("authorization start...");
    const {token, user} = await direct.run();
    return {token, user};
  } else return data;
};

const cliApp = new Command();
cliApp
  .description("adding an admin to many pages")
  .option("-su, --sourceUser [string]", "password vk page")
  .option("-tu, --targetUser [string]", "login vk page")
  .option("-ex, --exclude [string]", "<pageId>,<pageId>,<pageId>,...")
  .option("-in, --include [string]", "<pageId>,<pageId>,<pageId>,...")
  .action(async (_, {sourceUser, targetUser, exclude, include}: Options) => {
    const storage = Storage.get();
    storage.sourceUser = await loginUser(
      storage.sourceUser,
      sourceUser,
      "sourceUser",
    );
    Storage.save(storage);
    storage.targetUser = await loginUser(
      storage.targetUser,
      targetUser,
      "targetUser",
    );
    const excludeList = exclude?.split(",")?.map(Number)?.filter(Boolean);
    const includeList = include?.split(",")?.map(Number)?.filter(Boolean);
    Storage.save(storage);
    if (excludeList?.length) storage.sourceUser.excludePage = excludeList;
    if (excludeList?.length) storage.sourceUser.includePage = includeList;
    if (!storage.captchaToken) {
      storage.captchaToken = readlineSync.question("captcha token:").trim();
      Storage.save(storage);
    }

    const vkSource = new VK({token: storage.sourceUser.token, apiVersion});
    const vkTarget = new VK({token: storage.targetUser.token, apiVersion});
    const captchaResolver = new CaptchaResolver({
      key: storage.captchaToken,
      callbackNullBalance: () => "монета кончилась на счету",
    });

    vkSource.callbackService.onCaptcha((ret, retry) => {
      captchaResolver.resolveNormalCaptcha({url: ret.src}).then(asd => {
        retry(asd!);
      });
    });
    vkTarget.callbackService.onCaptcha((ret, retry) => {
      captchaResolver.resolveNormalCaptcha({url: ret.src}).then(asd => {
        retry(asd!);
      });
    });

    type PageT = Objects.GroupsGroupFull & {is_closed: number};
    const list = (await vkSource.api.groups.get({
      filter: ["admin", "editor"],
      extended: true,
    })) as unknown as {
      items: PageT[];
    };
    if (storage.sourceUser.excludePage?.length) {
      const newList = list.items.filter(page => {
        return !storage.sourceUser.excludePage?.includes(page.id!);
      });
      console.log(
        `Активно excludePage. До фильтрации: ${list.items.length}. После: ${newList.length}`,
      );
      list.items = newList;
    }
    if (storage.sourceUser.includePage?.length) {
      const newList = list.items.filter(page => {
        return storage.sourceUser.includePage?.includes(page.id!);
      });
      console.log(
        `Активно includePage. До фильтрации: ${list.items.length}. После: ${newList.length}`,
      );
      list.items = newList;
    }
    if (storage.sourceUser.searchWords) {
      const newList = list.items.filter(page => {
        for (const word of storage.sourceUser.searchWords!)
          if (filterReg(page.name!, word)) return true;
        return false;
      });
      console.log(
        `Активна фильтрация. До фильтрации: ${list.items.length}. После: ${newList}`,
      );
      list.items = newList;
    }

    console.log(
      `Администрируемых сообществ в источниках: ${list.items.length}`,
    );
    const publicPage = list.items.filter(
      ({is_closed, deactivated}) => is_closed === 0 && !Boolean(deactivated),
    );
    const banned = list.items.filter(({deactivated}) => Boolean(deactivated));
    console.log(
      `Администрируемых публичных сообществ в источниках: ${list.items.length}`,
    );

    console.log(
      `Заблокированных сообществ в источнике(${storage.sourceUser.user}): ${banned.length}`,
    );
    banned.map(page => {
      console.log(`${page.deactivated}\t (${page.id})\t${page.name}`);
    });

    let offset;
    const AllTargetPage = new Set<number>();
    let items: number[] = [];
    do {
      items = await vkTarget.api.groups
        .get({
          offset,
          count: 1000,
        })
        .then(({items}) => items);
      items.map(id => AllTargetPage.add(id));
    } while (items.length === 1000);

    const addedId = publicPage
      .filter(({id}) => !AllTargetPage.has(id!))
      .map(({id}) => id);
    console.log(`Сообщества в которые необходимо вступить ${addedId.length}`);

    const pageCache = publicPage.reduce((acc, page) => {
      return {
        ...acc,
        [page.id!]: page,
      };
    }, {} as {[key: string]: PageT});

    let addedCount = 0;
    await Promise.all(
      addedId.map(async id => {
        const page = pageCache[id!];
        await vkTarget.api.groups
          .join({
            group_id: id,
          })
          .then(() =>
            console.log(
              `Вступили в страницу (${page.id})(${addedCount++}/${
                addedId.length
              })\t${page.name}`,
            ),
          )
          .catch(err => console.log(id, err));
      }),
    );

    let publicCount = 0;
    await Promise.all(
      publicPage.map(async ({id}) => {
        const page = pageCache[id!];
        vkSource.api.groups
          .editManager({
            group_id: id!,
            user_id: storage.targetUser.user,
            role: "administrator",
          })
          .then(ret =>
            console.log(
              `${ret ? "Назначили админов" : "Уже администратор"} (${
                page.id
              })(${publicCount++}/${publicPage.length})\t${page.name}`,
            ),
          )
          .catch(err => console.log(id, err));
      }),
    );
  });
cliApp.parse();
