/**
 * Top navigation bar.
 *
 * The markup is the *captured* Sigma header (`src/generated/top-nav.inner.html`)
 * rendered verbatim, so spacing, icon sizes and the nav's active-colour swap
 * match the live site. On top of it this file re-implements the account dropdown
 * — profile + balance + Deposit, level / XP badges, Cashback breakdown, a
 * Language submenu and Log out — as a portal with the same positioning, outside
 * click, Escape and resize-to-close behaviour Radix gives the live menu.
 *
 * Three things are added on top of the capture, for requirement `19`:
 *   1. a **total available across all chains** next to the username;
 *   2. the chain mark in the balance row is a **chain switcher** that names the
 *      chain in text and lists every chain's balance;
 *   3. both read and write the shared `useChainContext` store, so "current chain"
 *      has one source instead of being implied by the last page visited.
 *
 * The Deposit button also opens our own `DepositDialog` (the captured markup has
 * no handler attached to it), and navigation is delegated through
 * `onNavigate(label)` instead of a path router.
 *
 * `top-nav.inner.html` uses two custom properties from the site's own build
 * (`--header-content-height`, `--trending-bar-height`). They are declared on the
 * header element here rather than in `index.css`, so this component carries its
 * own requirements.
 */
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import baseHtml from "@/generated/top-nav.inner.html?raw";
import accountMenuHtml from "@/generated/account-menu.inner.html?raw";
import languageMenuHtml from "@/generated/language-menu.inner.html?raw";
import menuClasses from "@/generated/menu-classes.json";
import { DepositDialog } from "@/components/deposit/DepositDialog";
import { CHAINS, CHAIN_ORDER, type ChainId } from "@/lib/chain-registry";
import { useBalanceSummary, useChainContext, usdValue } from "@/stores/chain-context";

const NAV_LABELS = ["Discover", "Pulse", "Traders", "Trading", "Portfolio", "Rewards", "Orders", "Settings"];

const MENU_WIDTH = 260;

const CHEVRON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

/** Move the captured check mark onto the selected language item. */
function withLangCheck(html: string, lang: "en" | "zh"): string {
  const checkRe = /<svg[^>]*class="lucide lucide-check"[^>]*>[\s\S]*?<\/svg>/;
  const match = html.match(checkRe);
  if (!match) return html;
  const check = match[0];
  const label = lang === "zh" ? "Chinese" : "English";
  const re = new RegExp(`(<span class="min-w-18 flex-grow-1">${label}</span>)`);
  return html.replace(checkRe, "").replace(re, `$1${check}`);
}

function withActiveNav(html: string, active: string): string {
  let out = html;
  for (const label of NAV_LABELS) {
    const re = new RegExp(`(<span class=")([^"]*)("[^>]*>${label}</span>)`);
    out = out.replace(re, (_m, pre: string, cls: string, post: string) => {
      const tokens = cls
        .split(/\s+/)
        .filter(Boolean)
        .map((t) =>
          t === "text-primary" || t === "text-muted-foreground"
            ? label === active
              ? "text-primary"
              : "text-muted-foreground"
            : t,
        );
      return pre + tokens.join(" ") + post;
    });
  }
  return out;
}

const usd = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;

type AccountMenuVars = {
  chain: ChainId;
  chainUsd: number;
  totalUsd: number;
  unavailable: number;
};

/**
 * Re-point the captured account menu at the live chain context:
 * the username row gains a total, and the balance row gains a chain switcher and
 * the current chain's balance.
 */
function withAccountContext(html: string, vars: AccountMenuVars): string {
  const meta = CHAINS[vars.chain];

  const totalBlock = `
    <div class="ml-auto flex flex-col items-end gap-0.5 leading-tight" title="Total available across all chains">
      <span class="text-sm font-semibold tabular-nums">${usd(vars.totalUsd)}</span>
      <span class="text-muted-foreground text-[10px]">Total available</span>
      ${
        vars.unavailable > 0
          ? `<span class="text-[10px] text-amber-400">${vars.unavailable} chain${
              vars.unavailable > 1 ? "s" : ""
            } unavailable</span>`
          : ""
      }
    </div>`;

  const switcher = `
    <button type="button" data-slot="chain-switcher" class="flex cursor-pointer items-center gap-1 rounded-md text-left outline-none transition-colors hover:text-foreground">
      <img alt="${meta.name}" class="inline h-4 w-auto" src="${meta.logo}">
      <span class="text-xs font-medium">${meta.name}</span>
      <span class="text-muted-foreground">${CHEVRON}</span>
    </button>`;

  let out = html;

  // NB: every replacement below uses a callback. The generated blocks contain
  // `$` (money), and `$` is special inside a replace() *string* — `$116` would be
  // read as group 1 followed by "16", duplicating the match and dropping the sign.

  // 1. total next to the username
  out = out.replace(
    /(<div class="grid flex-1 text-left leading-tight">[\s\S]*?<\/div>)/,
    (match) => match + totalBlock,
  );

  // 2. the captured chain mark becomes the switcher
  out = out.replace(/<img alt="base"[^>]*>/, () => switcher);

  // 3. the captured balance follows the current chain
  out = out.replace(
    /<span class="text-lg font-bold">\$75<\/span>/,
    () => `<span class="text-lg font-bold">${usd(vars.chainUsd)}</span>`,
  );

  return out;
}

interface Props {
  active?: string;
  onNavigate?: (item: string) => void;
}

interface MenuPos {
  top: number;
  left: number;
  triggerWidth: number;
}

export function TopNav({ active = "Discover", onNavigate }: Props) {
  const [menu, setMenu] = useState<MenuPos | null>(null);
  const [submenu, setSubmenu] = useState<{ top: number; right: number } | null>(null);
  const [chainList, setChainList] = useState<{ top: number; left: number } | null>(null);
  const [lang, setLang] = useState<"en" | "zh">("en");
  const [depositOpen, setDepositOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const chainRef = useRef<HTMLDivElement>(null);

  const { currentChain, setCurrentChain } = useChainContext();
  const { total, unavailable, balances } = useBalanceSummary();

  const trigger = () => document.querySelector<HTMLElement>('header [data-slot="dropdown-menu-trigger"]');

  const syncTrigger = (open: boolean) => {
    const btn = trigger();
    btn?.setAttribute("data-state", open ? "open" : "closed");
    btn?.setAttribute("aria-expanded", String(open));
  };

  const closeAll = () => {
    setMenu(null);
    setSubmenu(null);
    setChainList(null);
    syncTrigger(false);
  };

  const openMenu = (rect: DOMRect) => {
    setMenu({ top: rect.bottom + 4, left: rect.right - MENU_WIDTH, triggerWidth: rect.width });
    syncTrigger(true);
  };

  const openSubmenu = (item: HTMLElement, menuLeft: number) => {
    const r = item.getBoundingClientRect();
    setSubmenu({ top: r.top, right: window.innerWidth - menuLeft - 5 });
  };

  const openChainList = (item: HTMLElement, menuLeft: number) => {
    const r = item.getBoundingClientRect();
    setChainList({ top: r.bottom + 4, left: menuLeft });
    setSubmenu(null);
  };

  // close on outside click / Escape / resize
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (
        menuRef.current?.contains(t) ||
        subRef.current?.contains(t) ||
        chainRef.current?.contains(t)
      ) {
        return;
      }
      if (t.closest('[data-slot="dropdown-menu-trigger"]')) return;
      closeAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    const onResize = () => closeAll();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [menu]);

  // clicks coming from inside the portal (menu / submenu / chain list)
  const onMenuClick = (e: ReactMouseEvent<HTMLElement>) => {
    const t = e.target as HTMLElement;

    // chain selection: keep the menu open so the balance row is seen updating
    const option = t.closest("[data-chain-option]") as HTMLElement | null;
    if (option) {
      e.stopPropagation();
      setCurrentChain(option.getAttribute("data-chain-option") as ChainId);
      setChainList(null);
      return;
    }

    if (t.closest('[data-slot="chain-switcher"]') && menu) {
      e.stopPropagation();
      const item = t.closest('[data-slot="chain-switcher"]') as HTMLElement;
      if (chainList) setChainList(null);
      else openChainList(item, menu.left);
      return;
    }

    if (t.closest('[data-slot="dropdown-menu-sub-trigger"]') && menu) {
      e.stopPropagation();
      const item = t.closest('[data-slot="dropdown-menu-sub-trigger"]') as HTMLElement;
      if (submenu) setSubmenu(null);
      else openSubmenu(item, menu.left);
      return;
    }

    if (t.closest('[role="menuitem"]')) {
      const item = t.closest('[role="menuitem"]') as HTMLElement;
      if (subRef.current?.contains(item)) {
        setLang(item.textContent?.includes("Chinese") ? "zh" : "en");
      }
      closeAll();
    }
  };

  const onHeaderClick = (e: ReactMouseEvent<HTMLElement>) => {
    const t = e.target as HTMLElement;

    // Deposit — the capture has no handler of its own, so ours is added here.
    const deposit = t.closest('[data-slot="button"]') as HTMLElement | null;
    if (deposit && deposit.textContent?.trim() === "Deposit") {
      e.preventDefault();
      setDepositOpen(true);
      return;
    }

    const acct = t.closest('[data-slot="dropdown-menu-trigger"]') as HTMLElement | null;
    if (acct) {
      e.preventDefault();
      if (menu) closeAll();
      else openMenu(acct.getBoundingClientRect());
      return;
    }

    const label = t.closest("span")?.textContent?.trim();
    if (label && NAV_LABELS.includes(label)) {
      e.preventDefault();
      onNavigate?.(label);
    }
  };

  const menuHtml = withAccountContext(accountMenuHtml, {
    chain: currentChain,
    chainUsd: usdValue(currentChain, balances[currentChain]?.amount ?? 0),
    totalUsd: total,
    unavailable: unavailable.length,
  });

  return (
    <>
      <header
        className="z-50 flex w-full items-center border-b border-border bg-canvas"
        style={
          {
            "--header-content-height": "calc(var(--spacing) * 14)",
            "--trending-bar-height": "calc(var(--spacing) * 9)",
          } as CSSProperties
        }
        onClick={onHeaderClick}
        dangerouslySetInnerHTML={{ __html: withActiveNav(baseHtml, active) }}
      />

      {menu &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            data-state="open"
            data-side="bottom"
            data-align="end"
            data-slot="dropdown-menu-content"
            className={menuClasses.menu}
            style={
              {
                position: "fixed",
                top: menu.top,
                left: menu.left,
                "--radix-dropdown-menu-trigger-width": `${menu.triggerWidth}px`,
              } as CSSProperties
            }
            onClick={onMenuClick}
            onMouseOver={(e) => {
              const t = e.target as HTMLElement;
              const item = t.closest('[data-slot="dropdown-menu-sub-trigger"]') as HTMLElement | null;
              if (item && !submenu) openSubmenu(item, menu.left);
            }}
            dangerouslySetInnerHTML={{ __html: menuHtml }}
          />,
          document.body,
        )}

      {menu && chainList &&
        createPortal(
          <div
            ref={chainRef}
            role="menu"
            aria-label="Switch chain"
            data-state="open"
            data-slot="dropdown-menu-sub-content"
            className={menuClasses.submenu}
            style={{ position: "fixed", top: chainList.top, left: chainList.left }}
            onClick={onMenuClick}
          >
            <div className="text-muted-foreground px-2 py-1 text-[11px] tracking-wide uppercase">
              Available by chain
            </div>
            {CHAIN_ORDER.map((id) => {
              const meta = CHAINS[id];
              const entry = balances[id];
              const active = id === currentChain;
              const failed = !entry || entry.status !== "ok";
              return (
                <div
                  key={id}
                  role="menuitem"
                  data-chain-option={id}
                  data-slot="dropdown-menu-item"
                  className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none"
                >
                  <img alt={meta.name} src={meta.logo} className="inline h-4 w-auto" />
                  <span className={active ? "text-primary font-medium" : undefined}>{meta.name}</span>
                  <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                    {failed ? "—" : `${entry.amount} ${meta.symbol}`}
                  </span>
                  <span
                    className={
                      active
                        ? "text-primary w-14 text-right text-xs font-medium tabular-nums"
                        : "w-14 text-right text-xs tabular-nums"
                    }
                  >
                    {failed ? "unavailable" : usd(usdValue(id, entry.amount))}
                  </span>
                </div>
              );
            })}
          </div>,
          document.body,
        )}

      {menu &&
        submenu &&
        createPortal(
          <div
            ref={subRef}
            role="menu"
            aria-orientation="vertical"
            data-state="open"
            data-side="left"
            data-align="start"
            data-slot="dropdown-menu-sub-content"
            className={menuClasses.submenu}
            style={{ position: "fixed", top: submenu.top, right: submenu.right }}
            onClick={onMenuClick}
            dangerouslySetInnerHTML={{ __html: withLangCheck(languageMenuHtml, lang) }}
          />,
          document.body,
        )}

      <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} />
    </>
  );
}
