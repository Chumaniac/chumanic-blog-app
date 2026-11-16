const PROFILE_SCHEMA = "chumanic.journal.reading-profile/v1";
const PREFERENCE_VALUES = {
  size: ["normal", "large", "largest"],
  spacing: ["normal", "relaxed"],
  measure: ["normal", "narrow"],
};
function hasKeys(value, keys) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...keys].sort().join(",")
  );
}
export function parseReadingProfile(value, articleIds) {
  if (
    !hasKeys(value, ["schema", "articleId", "prefs"]) ||
    value.schema !== PROFILE_SCHEMA
  )
    throw Error("PROFILE_FORMAT");
  if (
    typeof value.articleId !== "string" ||
    !articleIds.includes(value.articleId)
  )
    throw Error("PROFILE_ARTICLE");
  if (
    !hasKeys(value.prefs, Object.keys(PREFERENCE_VALUES)) ||
    !Object.entries(PREFERENCE_VALUES).every(([key, values]) =>
      values.includes(value.prefs[key]),
    )
  )
    throw Error("PROFILE_PREFS");
  return {
    schema: PROFILE_SCHEMA,
    articleId: value.articleId,
    prefs: {
      size: value.prefs.size,
      spacing: value.prefs.spacing,
      measure: value.prefs.measure,
    },
  };
}
export function readingProfile(articleId, prefs, articleIds) {
  return parseReadingProfile(
    { schema: PROFILE_SCHEMA, articleId, prefs },
    articleIds,
  );
}

// The page keeps one complete article readable when scripts are unavailable.
// The guard also lets native Node tests exercise the actual profile schema.
if (typeof document !== "undefined") {
  const articles = [
    {
      id: "edit",
      title: "留一份能核对的输入",
      section: "开发笔记",
      body: [
        "对账最常见的分歧发生在输入端。拿一张领料单，把应有数量和实收数量并排，先看看哪些行有差异。",
        "同事复查时，需要的是那张原始单据、当时的两列数字，以及采用的计算规则。保存输入之后，再保存结果。",
      ],
    },
    {
      id: "warn",
      title: "读懂一次检查的警告",
      section: "工具手记",
      body: [
        "目录检查通过后，报告里可能仍然写着一项警告。打开对应文件，找到触发检查的声明，再判断是否需要修改。",
        "把检查范围和未确认的条件写进记录。过一周回来，仍能看出当时核对了哪部分内容。",
      ],
    },
    {
      id: "offline",
      title: "断网时还能看到什么",
      section: "界面观察",
      body: [
        "在一份离线记录上，最后更新时间和数据来源比一个闪动的圆圈更有用。",
        "保留最后一份成功结果，说明哪些操作需要恢复连接，并提供可以主动重试的入口。",
      ],
    },
  ];
  const byId = (id) => document.getElementById(id),
    key = "chumanic.journal.sample.v1";
  const hasBackup = Boolean(
    byId("profile-import") && byId("profile-export") && byId("profile-status"),
  );
  let current = articles[0].id,
    displayed,
    importEpoch = 0,
    activeReader = null,
    readTimer = null,
    downloadURL = null,
    downloadTimer = null;
  try {
    const saved = localStorage.getItem(key);
    if (articles.some((a) => a.id === saved)) current = saved;
  } catch {
    /* Reading stays available without storage. */
  }
  function backupControls() {
    if (!hasBackup) return;
    byId("profile-import").disabled = Boolean(activeReader);
    byId("profile-cancel").hidden = !activeReader;
    byId("profile-export").disabled = Boolean(activeReader) || !displayed;
    byId("profile-status").setAttribute(
      "aria-busy",
      String(Boolean(activeReader)),
    );
  }
  function cancelImport(message) {
    if (!activeReader) return;
    importEpoch++;
    const reader = activeReader;
    activeReader = null;
    clearTimeout(readTimer);
    readTimer = null;
    reader.onload = reader.onerror = reader.onabort = null;
    reader.abort();
    backupControls();
    byId("profile-status").textContent = message;
  }
  function finishRead(reader, epoch) {
    if (epoch !== importEpoch || reader !== activeReader) return false;
    clearTimeout(readTimer);
    readTimer = null;
    reader.onload = reader.onerror = reader.onabort = null;
    activeReader = null;
    backupControls();
    return true;
  }
  function render() {
    cancelImport("阅读内容已变化，已停止读取备份；当前选择保持不变。");
    const query = byId("query").value.trim().toLowerCase(),
      matches = articles.filter((a) =>
        [a.title, ...a.body].join(" ").toLowerCase().includes(query),
      );
    const list = byId("list");
    list.replaceChildren();
    const article = matches.find((item) => item.id === current) ?? matches[0];
    displayed = article?.id;
    for (const article of matches) {
      const button = document.createElement("button");
      button.textContent = article.title;
      if (article.id === displayed) button.setAttribute("aria-current", "page");
      const category = document.createElement("small");
      category.textContent = article.section;
      button.append(category);
      button.onclick = () => {
        current = article.id;
        render();
        closeDirectory();
        document.querySelector("article").focus();
      };
      list.append(button);
    }
    byId("body").replaceChildren();
    byId("note").textContent = "";
    byId("section").textContent = article?.section || "";
    byId("title").textContent = article?.title || "没有匹配的文章";
    byId("remember").hidden = !article;
    byId("directory-toggle").textContent = article
      ? article.title + " · 切换文章"
      : "没有匹配文章 · 修改搜索";
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.textContent = "没有匹配的文章，请换个词或清空搜索。";
      empty.className = "directory-empty";
      list.append(empty);
    }
    const index = matches.indexOf(article);
    for (const [id, offset] of [
      ["previous", -1],
      ["next", 1],
    ]) {
      const next = matches[index + offset];
      byId(id).disabled = !article || !next;
      byId(id).onclick = () => {
        if (next) {
          current = next.id;
          render();
          closeDirectory();
          document.querySelector("article").focus();
        }
      };
    }
    for (const text of article?.body || []) {
      const p = document.createElement("p");
      p.textContent = text;
      byId("body").append(p);
    }
    backupControls();
  }
  function closeDirectory() {
    document.querySelector("aside").dataset.open = "false";
    byId("directory-toggle").setAttribute("aria-expanded", "false");
  }
  byId("directory-toggle").onclick = () => {
    const open =
      byId("directory-toggle").getAttribute("aria-expanded") !== "true";
    document.querySelector("aside").dataset.open = String(open);
    byId("directory-toggle").setAttribute("aria-expanded", String(open));
    if (open) byId("query").focus();
  };
  byId("directory").addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDirectory();
      byId("directory-toggle").focus();
    }
  });
  byId("query").addEventListener("input", render);
  byId("remember").onclick = () => {
    cancelImport("已停止读取备份，保留当前篇目。");
    if (!displayed) return;
    current = displayed;
    try {
      localStorage.setItem(key, current);
      byId("note").textContent = "已保存，下次打开会回到这篇文章。";
    } catch {
      byId("note").textContent = "浏览器未允许保存，仍可继续阅读。";
    }
  };
  render();
  const preferenceKey = "chumanic.journal.preferences.v1",
    controls = Array.from(byId("preferences").querySelectorAll("select"));
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey) || "{}");
    for (const control of controls) {
      const value = saved?.[control.id];
      if (Array.from(control.options).some((option) => option.value === value))
        control.value = value;
    }
  } catch {
    /* Native selects remain usable. */
  }
  function savePreferences() {
    cancelImport("阅读设置已变化，已停止读取备份。");
    try {
      localStorage.setItem(
        preferenceKey,
        JSON.stringify(
          Object.fromEntries(controls.map((c) => [c.id, c.value])),
        ),
      );
      byId("pref-status").textContent = "阅读设置已保存。";
    } catch {
      byId("pref-status").textContent = "设置已应用到本页，浏览器未允许保存。";
    }
  }
  byId("preferences").addEventListener("change", savePreferences);
  byId("preferences").addEventListener("reset", () => {
    cancelImport("已停止读取备份，正在恢复本页默认排版。");
    try {
      localStorage.removeItem(preferenceKey);
      byId("pref-status").textContent = "已恢复默认。";
    } catch {
      byId("pref-status").textContent =
        "本页已恢复默认，浏览器未允许清除记录。";
    }
  });
  byId("save-preferences")?.addEventListener("click", savePreferences);
  byId("guide-directory").onclick = () => {
    document.querySelector("aside").dataset.open = "true";
    byId("directory-toggle").setAttribute("aria-expanded", "true");
    byId("query").focus();
  };
  byId("guide-preferences").onclick = () => {
    document.querySelector(".reading-settings").open = true;
    byId("size").focus();
  };
  byId("guide-remember").onclick = () => {
    if (!byId("remember").hidden) {
      byId("remember").focus();
      byId("remember").scrollIntoView({ block: "center" });
    } else byId("guide-directory").click();
  };
  function releaseDownload() {
    clearTimeout(downloadTimer);
    if (downloadURL) URL.revokeObjectURL(downloadURL);
    downloadURL = null;
  }
  if (hasBackup) {
    byId("profile-export").onclick = () => {
      if (!displayed) return;
      const profile = readingProfile(
        displayed,
        Object.fromEntries(controls.map((c) => [c.id, c.value])),
        articles.map((a) => a.id),
      );
      releaseDownload();
      downloadURL = URL.createObjectURL(
        new Blob([JSON.stringify(profile, null, 2) + "\n"], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = downloadURL;
      link.download = "journal-reading-profile.json";
      document.body.append(link);
      link.click();
      link.remove();
      downloadTimer = setTimeout(releaseDownload, 1000);
      byId("profile-status").textContent =
        "已导出当前篇目与排版设置，不包含文章正文。";
    };
    byId("profile-cancel").onclick = () =>
      cancelImport("已取消导入，当前阅读与已保存设置保持不变。");
    byId("profile-import").onchange = (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || activeReader) return;
      if (file.size > 8192) {
        byId("profile-status").textContent =
          "请选择不超过 8 KiB 的阅读设置 JSON；当前阅读保持不变。";
        return;
      }
      const reader = new FileReader(),
        epoch = ++importEpoch;
      activeReader = reader;
      backupControls();
      byId("profile-status").textContent =
        "正在读取设置，尚未更改当前阅读；可以取消或继续阅读。";
      reader.onload = () => {
        if (epoch !== importEpoch || reader !== activeReader) return;
        try {
          if (typeof reader.result !== "string") throw Error("PROFILE_FORMAT");
          const p = parseReadingProfile(
            JSON.parse(reader.result),
            articles.map((a) => a.id),
          );
          if (!finishRead(reader, epoch)) return;
          for (const control of controls) control.value = p.prefs[control.id];
          current = p.articleId;
          byId("query").value = "";
          render();
          closeDirectory();
          byId("profile-status").textContent =
            "已应用到当前页。需要保留时，分别保存篇目和阅读设置；已保存的数据尚未改写。";
          document.querySelector("article").focus();
        } catch (error) {
          if (finishRead(reader, epoch)) {
            const messages = {
              PROFILE_ARTICLE:
                "备份中的篇目不在当前样例，请保留原文件；当前阅读保持不变。",
              PROFILE_PREFS:
                "备份中的排版值不受此版支持，请保留原文件；当前设置保持不变。",
            };
            byId("profile-status").textContent =
              messages[error?.message] ||
              "文件不符合阅读设置格式，请选择本页导出的 JSON；当前阅读保持不变。";
          }
        }
      };
      reader.onerror = () => {
        if (finishRead(reader, epoch))
          byId("profile-status").textContent =
            "无法读取文件，请重新选择本机 JSON；当前阅读保持不变。";
      };
      reader.onabort = () => {
        if (finishRead(reader, epoch))
          byId("profile-status").textContent = "已停止读取，当前阅读保持不变。";
      };
      readTimer = setTimeout(() => {
        if (epoch === importEpoch && reader === activeReader)
          cancelImport("读取设置超时，请重新选择文件；当前阅读保持不变。");
      }, 5000);
      try {
        reader.readAsText(file, "utf-8");
      } catch {
        if (finishRead(reader, epoch))
          byId("profile-status").textContent =
            "无法读取文件，请重新选择本机 JSON；当前阅读保持不变。";
      }
    };
  }
  window.addEventListener("pagehide", () => {
    cancelImport("已离开阅读页，导入已停止。");
    releaseDownload();
  });
  for (const element of document.querySelectorAll("[data-requires-js]"))
    element.disabled = false;
  byId("reader-loading")?.setAttribute("hidden", "");
  backupControls();
}
