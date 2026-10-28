const $ = (s) => document.querySelector(s);
const categories = {
  餐饮: "◒",
  购物: "▧",
  交通: "↗",
  住房: "⌂",
  生活: "✳",
  娱乐: "♫",
  医疗: "✚",
  工资: "▤",
  其他: "○",
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
let state;
try {
  state = JSON.parse(localStorage.getItem("xiaoman") || "null");
} catch {}
state =
  state && Array.isArray(state.items)
    ? state
    : { items: [], budget: 2500, currency: "CAD" };
state.dismissed = Array.isArray(state.dismissed) ? state.dismissed : [];
let page = "home",
  month = today().slice(0, 7),
  filter = "all";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const navIcon = (name) => {
  const paths = {
    home: "M3 10 12 3l9 7v11h-6v-7H9v7H3Z",
    stats: "M4 21V11h4v10M10 21V3h4v18M16 21V7h4v14",
    mail: "M3 5h18v14H3ZM3 5l9 7 9-7",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]}"/></svg>`;
};
const money = (n) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: state.currency,
  }).format(n);
function save() {
  try {
    localStorage.setItem("xiaoman", JSON.stringify(state));
  } catch {
    alert("保存失败，设备空间不足。请立即导出备份。");
    return false;
  }
  return true;
}
const items = () => state.items.filter((i) => i.date.startsWith(month));
const sum = (type) =>
  items()
    .filter((i) => i.type === type)
    .reduce((a, b) => a + Math.round(b.amount * 100), 0) / 100;
function render() {
  const exp = sum("expense"),
    inc = sum("income");
  $("#app").innerHTML =
    `<header><a class="brand" href="#" aria-label="首页"><span class="logo">⌂</span><span>小满<small>把日子，过得有数</small></span></a><button class="avatar" data-page="settings" aria-label="设置">家</button></header><main>${
      page === "home"
        ? `<div class="heading"><div><p class="eyebrow">OUR EVERYDAY, WELL KEPT</p><h1>家的每一笔，都值得记录<span>。</span></h1><p class="muted">从柴米油盐，到生活里的小确幸。</p></div><input aria-label="选择月份" id="month" type="month" value="${month}"></div><section class="balance"><div class="balance-top"><span>${month.replace("-", " 年 ")} 月 · 本月支出</span><span class="pill">家庭账本</span></div><div class="total">${money(exp)}</div><div class="balance-bottom"><div><small>本月收入</small><strong>↗ ${money(inc)}</strong></div><div><small>本月结余</small><strong>${money(inc - exp)}</strong></div><span class="plant">✳</span></div></section><section class="budget"><div><span>月度预算</span><strong>${money(Math.max(0, state.budget - exp))}<small> 剩余</small></strong></div><div class="track"><i style="width:${Math.min(100, state.budget > 0 ? (exp / state.budget) * 100 : 100)}%"></i></div><p>${exp > state.budget ? "已超出预算 " + money(exp - state.budget) : "慢慢积攒，生活自有余裕。"}<span>${money(state.budget)}</span></p></section><div class="section-title"><h2>最近收支 <small>${items().length} 笔</small></h2><button class="text" data-action="add">＋ 记一笔</button></div><div class="filters">${[
            ["all", "全部"],
            ["expense", "支出"],
            ["income", "收入"],
          ]
            .map(
              ([v, t]) =>
                `<button class="${filter === v ? "active" : ""}" data-filter="${v}">${t}</button>`,
            )
            .join(
              "",
            )}</div>${list(items().filter((i) => filter === "all" || i.type === filter))}`
        : page === "stats"
          ? `<div class="heading"><div><p class="eyebrow">A LITTLE CLARITY</p><h1>看见生活的流向。</h1><p class="muted">${month} · 支出分类</p></div><input id="month" aria-label="选择月份" type="month" value="${month}"></div><section class="panel"><p class="muted">本月总支出</p><h1>${money(exp)}</h1>${
              exp
                ? Object.keys(categories)
                    .map((c) => {
                      const v =
                        items()
                          .filter(
                            (i) => i.type === "expense" && i.category === c,
                          )
                          .reduce((a, b) => a + Math.round(b.amount * 100), 0) /
                        100;
                      return v
                        ? `<div class="stat"><div><span>${categories[c]} ${c}</span><strong>${money(v)} <small>${Math.round((v / exp) * 100)}%</small></strong></div><div class="track"><i style="width:${(v / exp) * 100}%"></i></div></div>`
                        : "";
                    })
                    .join("")
                : '<div class="empty">记下第一笔，收支分布就会出现在这里。</div>'
            }</section>`
          : page === "mail"
            ? mail()
            : settings()
    }</main><nav>${[
      ["home", "⌂", "账本"],
      ["stats", "▥", "统计"],
      ["mail", "✉", "邮件"],
      ["settings", "⚙", "我的"],
    ]
      .map(
        ([v, i, t]) =>
          `<button data-page="${v}" class="${page === v ? "selected" : ""}"><b>${navIcon(v)}</b>${t}</button>`,
      )
      .join(
        "",
      )}</nav><button class="fab" data-action="add" aria-label="记一笔">＋</button><dialog id="entry"></dialog><div id="toast" role="status"></div>`;
  bind();
}
function list(rows) {
  return rows.length
    ? `<section class="transactions">${[...rows]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(
          (i) =>
            `<button class="transaction" data-edit="${esc(i.id)}"><span class="category ${i.type === "income" ? "income" : ""}">${categories[i.category] || "○"}</span><span class="description"><strong>${esc(i.merchant)}</strong><small>${esc(i.category)} · ${esc(i.date.slice(5))}${i.source === "email" ? " · 邮件导入" : ""}${i.needsReview ? " · 待确认" : ""}</small></span><strong class="amount ${i.type === "income" ? "green" : ""}">${i.type === "income" ? "+" : "−"}${money(i.amount)}</strong></button>`,
        )
        .join("")}</section>`
    : '<section class="empty"><span>⌑</span><h3>为生活记下第一笔</h3><p>一杯咖啡，一次采购，都是家的日常。</p><button class="primary" data-action="add">＋ 开始记账</button></section>';
}
function mail() {
  return `<div class="heading"><div><p class="eyebrow">LESS WORK, MORE LIFE</p><h1>让账单，自己找到家。</h1><p class="muted">Gmail 信用卡通知 · 自动导入</p></div></div><section class="panel"><span class="mail-icon">✉</span><h2>连接你的邮件收件箱</h2><p class="muted">通过你自己的 Google Apps Script 定时任务读取通知，发送到私人后台识别。后台仅保存交易，不保存邮件正文。需要先部署网站并配置密钥。</p><ol><li>按仓库 docs/GMAIL_SETUP.md 部署后台。</li><li>在 Google Apps Script 中安装脚本并授权 Gmail。</li><li>填入后台密钥，同步后逐笔确认。</li></ol><label>后台同步密钥<input id="mail-token" type="password" autocomplete="off" placeholder="与后台 EMAIL_WEBHOOK_SECRET 一致" value="${esc(sessionStorage.getItem("mail-token") || "")}"></label><p class="hint">密钥仅在当前会话保存。任何知道此密钥的人都能读取邮件交易，请勿分享。</p><button class="primary" id="sync">同步待确认交易</button><p id="sync-status" role="status" class="muted">尚未验证连接。App 关闭时由 Google 定时任务收取邮件。</p></section><div class="section-title"><h2>待确认</h2></div>${list(state.items.filter((i) => i.needsReview))}<section class="notice">邮件格式可能不同，自动识别不能替代银行账单。导入后请核对金额、商户和日期。外币交易需确认后换算为 CAD。</section>`;
}
function settings() {
  return `<div class="heading"><div><p class="eyebrow">A HOME FOR YOUR NUMBERS</p><h1>把生活，安放妥当。</h1><p class="muted">你的账本，由你掌握。</p></div></div><section class="panel"><h2>账本偏好</h2><label>月度预算（CAD）<input id="budget" type="number" min="0.01" step="0.01" value="${state.budget}"></label><button class="primary" id="save-budget">保存预算</button><p class="muted">默认货币：加元 CAD。当前版本为本机账本，不会自动与家人设备共享。</p></section><section class="panel"><h2>数据与备份</h2><p class="muted">账本保存在本设备浏览器中。清理网站数据或更换手机会丢失记录，请定期导出。导出文件包含财务信息，请妥善保管。</p><div class="button-row"><button class="secondary" id="export">导出备份</button><label class="secondary file-label">恢复备份<input id="import" type="file" accept="application/json" hidden></label></div></section><section class="panel"><h2>安装到 iPhone</h2><p class="muted">部署为 HTTPS 网站后，用 Safari 打开，点击「分享」→「添加到主屏幕」。无需 Mac 或 Apple Developer 账号。首次联网打开后可离线记账，邮件同步需要联网。</p></section>`;
}
function entry(id) {
  const item = state.items.find((i) => i.id === id);
  const d = $("#entry");
  d.innerHTML = `<form id="entry-form"><div class="section-title"><h2>${item ? "编辑记录" : "记下这一笔"}</h2><button type="button" id="close" class="text">关闭</button></div><label>类型<select name="type"><option value="expense">支出</option><option value="income" ${item?.type === "income" ? "selected" : ""}>收入</option></select></label><label>金额 · CAD<input name="amount" type="number" inputmode="decimal" min="0.01" max="999999999" step="0.01" required value="${item?.amount || ""}" placeholder="0.00"></label><label>商户 / 备注<input name="merchant" maxlength="80" required value="${esc(item?.merchant || "")}" placeholder="例如：超市采购"></label><div class="form-row"><label>分类<select name="category">${Object.keys(
    categories,
  )
    .map(
      (c) => `<option ${item?.category === c ? "selected" : ""}>${c}</option>`,
    )
    .join(
      "",
    )}</select></label><label>日期<input name="date" type="date" required value="${esc(item?.date || today())}"></label></div>${item?.needsReview ? '<p class="notice">请核对原始邮件。保存即确认此记录。</p>' : ""}<button class="primary full" type="submit">${item?.needsReview ? "确认并保存" : "保存记录"}</button>${item ? '<button type="button" class="danger full" id="delete">删除这笔记录</button>' : ""}</form>`;
  d.showModal();
  $("#close").onclick = () => d.close();
  $("#entry-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target),
      amount = Number(f.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) return;
    const next = {
      id: item?.id || crypto.randomUUID(),
      type: f.get("type"),
      amount,
      merchant: f.get("merchant").trim(),
      category: f.get("category"),
      date: f.get("date"),
      source: item?.source || "manual",
      needsReview: false,
    };
    if (!next.merchant) return;
    if (item) state.items = state.items.map((i) => (i.id === id ? next : i));
    else state.items.push(next);
    if (save()) {
      d.close();
      render();
      toast("已保存，生活又清晰了一点");
    }
  };
  if (item)
    $("#delete").onclick = () => {
      if (confirm("确定删除这笔记录？")) {
        if (item.source === "email") state.dismissed.push(id);
        state.items = state.items.filter((i) => i.id !== id);
        if (save()) {
          d.close();
          render();
        }
      }
    };
}
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast")?.classList.remove("show"), 3000);
}
function bind() {
  document.querySelectorAll("[data-page]").forEach(
    (b) =>
      (b.onclick = () => {
        page = b.dataset.page;
        render();
        window.scrollTo(0, 0);
      }),
  );
  $(".brand").onclick = (e) => {
    e.preventDefault();
    page = "home";
    render();
  };
  document
    .querySelectorAll('[data-action="add"]')
    .forEach((b) => (b.onclick = () => entry()));
  document
    .querySelectorAll("[data-edit]")
    .forEach((b) => (b.onclick = () => entry(b.dataset.edit)));
  document.querySelectorAll("[data-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        filter = b.dataset.filter;
        render();
      }),
  );
  if ($("#month"))
    $("#month").onchange = (e) => {
      if (e.target.value) {
        month = e.target.value;
        render();
      }
    };
  if ($("#save-budget"))
    $("#save-budget").onclick = () => {
      const n = Number($("#budget").value);
      if (n > 0 && Number.isFinite(n)) {
        state.budget = n;
        if (save()) toast("预算已更新");
      } else toast("请输入有效预算");
    };
  if ($("#export"))
    $("#export").onclick = () => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify({ ...state, version: 1 }, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `xiaoman-${today()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  if ($("#import"))
    $("#import").onchange = async (e) => {
      try {
        const f = e.target.files[0];
        if (!f) return;
        if (f.size > 5000000) throw Error();
        const data = JSON.parse(await f.text());
        if (
          data.currency !== "CAD" ||
          !Array.isArray(data.items) ||
          !Number.isFinite(data.budget) ||
          data.budget <= 0 ||
          data.items.some(
            (i) =>
              typeof i.id !== "string" ||
              typeof i.merchant !== "string" ||
              !["income", "expense"].includes(i.type) ||
              !Object.hasOwn(categories, i.category) ||
              !Number.isFinite(i.amount) ||
              i.amount <= 0 ||
              !/^\d{4}-\d{2}-\d{2}$/.test(i.date),
          )
        )
          throw Error();
        if (confirm("恢复备份将替换本机全部记录，是否继续？")) {
          state = {
            items: data.items,
            budget: data.budget,
            currency: "CAD",
            dismissed: Array.isArray(data.dismissed)
              ? data.dismissed.filter((x) => typeof x === "string")
              : [],
          };
          if (save()) {
            render();
            toast("备份已恢复");
          }
        }
      } catch {
        toast("备份格式无效，请选择加元账本的 JSON 备份");
      }
    };
  if ($("#sync")) $("#sync").onclick = sync;
}
async function sync() {
  const token = $("#mail-token").value.trim();
  if (!token) {
    $("#sync-status").textContent = "请先填写后台同步密钥。";
    return;
  }
  sessionStorage.setItem("mail-token", token);
  $("#sync").disabled = true;
  try {
    const r = await fetch("./api/email/transactions", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok)
      throw Error(
        r.status === 401
          ? "密钥不正确，或后台尚未配置。"
          : "同步失败，请稍后再试。",
      );
    const { transactions } = await r.json();
    let count = 0,
      foreign = 0;
    for (const t of transactions) {
      if (t.currency !== "CAD") {
        foreign++;
        continue;
      }
      if (
        !state.dismissed.includes(t.id) &&
        !state.items.some((i) => i.id === t.id)
      ) {
        state.items.push(t);
        count++;
      }
    }
    if (!save()) return;
    render();
    $("#sync-status").textContent =
      `同步成功，新增 ${count} 笔待确认交易。${foreign ? `有 ${foreign} 笔币种不明或非 CAD 交易未导入，请检查原邮件并手动记账。` : ""}`;
  } catch (e) {
    $("#sync-status").textContent = e.message;
  } finally {
    if ($("#sync")) $("#sync").disabled = false;
  }
}
render();
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
