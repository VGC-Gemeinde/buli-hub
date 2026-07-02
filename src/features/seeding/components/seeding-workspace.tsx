"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  assignManyToDivision,
  assignToDivision,
  configureSeeding,
  generateAllGroups,
  generateGroups,
  initializeSeeding,
  moveToSubDivision,
  placePlayers,
  publishSeeding,
} from "../actions";
import {
  type SeedingPlayer,
  seedingReadiness,
  suggestedDivisionCount,
} from "../placement";
import {
  assembleSheetRows,
  type DivisionRef,
  type Placement,
  type SheetFilter,
  type SubDivisionRef,
} from "../sheet";
import { BulkBar } from "./bulk-bar";
import { SeedingSheet } from "./seeding-sheet";
import { SeedingToolbar } from "./seeding-toolbar";

type Override = { divisionId?: string | null; subDivisionId?: string | null };

export function SeedingWorkspace({
  players,
  divisions,
  subDivisions,
  initialSize,
  initialDivisionCount,
  published,
  publishedAt,
}: {
  players: SeedingPlayer[];
  divisions: DivisionRef[];
  subDivisions: SubDivisionRef[];
  initialSize: number | null;
  initialDivisionCount: number;
  published: boolean;
  publishedAt: Date | null;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<SheetFilter>({
    query: "",
    status: "all",
  });
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [divisionCount, setDivisionCount] = useState(
    initialDivisionCount > 0 ? String(initialDivisionCount) : "",
  );
  const [size, setSize] = useState(initialSize ? String(initialSize) : "");
  const [configError, setConfigError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingDivisionId, setGeneratingDivisionId] = useState<
    string | null
  >(null);
  const configTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInit = useRef(false);

  // Whether this first render will trigger the lazy auto-init: an un-set-up
  // seeding (no divisions) that has returning players to place. Computed on the
  // client from the props, so we can show the loader from the very first paint.
  const willAutoInit =
    !published &&
    divisions.length === 0 &&
    suggestedDivisionCount(players) >= 1;
  const [initializing, setInitializing] = useState(willAutoInit);

  // Fresh server data (after any router.refresh) is the truth — drop optimism.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when server data arrives
  useEffect(() => {
    setOverrides({});
  }, [players]);

  // Lazy auto-init: the first time staff open an un-set-up seeding after close,
  // prefill the divisions and place returning players — once, via the action
  // (never during render). The loader below covers the work so the sheet only
  // ever renders in its final, sorted form.
  useEffect(() => {
    if (didInit.current || !willAutoInit) {
      return;
    }
    didInit.current = true;
    initializeSeeding().then((result) => {
      if (result.ok && result.initialized) {
        router.refresh(); // fresh props (divisions + placements) clear the loader
      } else {
        if (!result.ok) {
          setActionError(result.error);
        }
        setInitializing(false);
      }
    });
  }, [willAutoInit, router]);

  // The refreshed, initialized data has arrived — reveal the sorted workspace.
  useEffect(() => {
    if (divisions.length > 0) {
      setInitializing(false);
    }
  }, [divisions.length]);

  // Keep the division-count input in step with the server (e.g. after auto-init
  // creates the divisions). User edits reach the prop via save + refresh, so
  // this does not fight typing.
  useEffect(() => {
    setDivisionCount(
      initialDivisionCount > 0 ? String(initialDivisionCount) : "",
    );
  }, [initialDivisionCount]);

  const effectivePlayers = useMemo(
    () =>
      players.map((p) =>
        overrides[p.userId] ? { ...p, ...overrides[p.userId] } : p,
      ),
    [players, overrides],
  );

  const total = players.length;
  const placed = effectivePlayers.filter((p) => p.divisionId !== null).length;
  const grouped = effectivePlayers.filter(
    (p) => p.subDivisionId !== null,
  ).length;
  const ready = seedingReadiness(effectivePlayers).ready;
  const gateHint = ready
    ? "Endgültig — kann nicht rückgängig gemacht werden."
    : `Erst möglich, wenn alle Spieler platziert (${placed}/${total}) und in Gruppen (${grouped}/${total}) sind.`;

  const rows = useMemo(
    () =>
      assembleSheetRows({
        players: effectivePlayers,
        divisions,
        subDivisions,
        size: Number(size) || initialSize || 8,
        filter,
      }),
    [effectivePlayers, divisions, subDivisions, size, initialSize, filter],
  );

  function setOverride(userId: string, patch: Override) {
    setOverrides((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], ...patch },
    }));
  }
  function dropOverride(userId: string) {
    setOverrides((prev) => {
      const { [userId]: _removed, ...rest } = prev;
      return rest;
    });
  }

  function onConfigChange(nextCount: string, nextSize: string) {
    setDivisionCount(nextCount);
    setSize(nextSize);
    if (configTimer.current) {
      clearTimeout(configTimer.current);
    }
    configTimer.current = setTimeout(async () => {
      const result = await configureSeeding({
        divisionCount: nextCount,
        subDivisionSize: nextSize,
      });
      setConfigError(result.ok ? null : result.error);
      if (result.ok) {
        router.refresh();
      }
    }, 500);
  }

  async function onAssignDivision(userId: string, divisionId: string | null) {
    setOverride(userId, { divisionId, subDivisionId: null });
    setActionError(null);
    const result = await assignToDivision({ userId, divisionId });
    if (!result.ok) {
      dropOverride(userId);
      setActionError(result.error);
      return;
    }
    router.refresh();
  }

  async function onMoveGroup(userId: string, subDivisionId: string) {
    setOverride(userId, { subDivisionId });
    setActionError(null);
    const result = await moveToSubDivision({ userId, subDivisionId });
    if (!result.ok) {
      dropOverride(userId);
      setActionError(result.error);
      return;
    }
    router.refresh();
  }

  async function onGenerate(divisionId: string) {
    setGeneratingDivisionId(divisionId);
    setActionError(null);
    const result = await generateGroups({ divisionId });
    setGeneratingDivisionId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    router.refresh();
  }

  async function onGenerateAll() {
    setGeneratingAll(true);
    setActionError(null);
    const result = await generateAllGroups();
    setGeneratingAll(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    router.refresh();
  }

  async function onBulkAssign(divisionId: string | null) {
    const userIds = [...selection];
    if (userIds.length === 0) {
      return;
    }
    for (const userId of userIds) {
      setOverride(userId, { divisionId, subDivisionId: null });
    }
    setSelection(new Set());
    setActionError(null);
    const result = await assignManyToDivision({ userIds, divisionId });
    if (!result.ok) {
      setActionError(result.error);
    }
    router.refresh();
  }

  // Drag & drop: place the dragged player(s) onto an exact division + group.
  async function onPlace(userIds: string[], placement: Placement) {
    if (userIds.length === 0) {
      return;
    }
    for (const userId of userIds) {
      setOverride(userId, placement);
    }
    setSelection(new Set());
    setActionError(null);
    const result = await placePlayers({ userIds, ...placement });
    if (!result.ok) {
      for (const userId of userIds) {
        dropOverride(userId);
      }
      setActionError(result.error);
      return;
    }
    router.refresh();
  }

  function onToggleSelect(userId: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  async function onPublish() {
    const result = await publishSeeding();
    if (result.ok) {
      router.refresh();
    }
    return result;
  }

  const publishedNotice =
    published && publishedAt
      ? new Intl.DateTimeFormat("de-DE", {
          dateStyle: "long",
          timeStyle: "short",
        }).format(publishedAt)
      : null;

  // While the auto-init runs, cover the workspace so the sheet is never seen in
  // its pre-sorted state and the toolbar never shows a stale division count.
  if (initializing) {
    return <SeedingInitLoader />;
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <SeedingToolbar
        published={published}
        divisionCount={divisionCount}
        size={size}
        configError={configError}
        onConfigChange={onConfigChange}
        placed={placed}
        grouped={grouped}
        total={total}
        ready={ready}
        gateHint={gateHint}
        onPublish={onPublish}
        onGenerateAll={onGenerateAll}
        generatingAll={generatingAll}
        filter={filter}
        onFilterChange={setFilter}
      />

      {actionError ? (
        <p className="px-7 py-1.5 text-destructive text-sm">{actionError}</p>
      ) : null}
      {publishedNotice ? (
        <p className="border-brand-orange/40 border-b bg-brand-orange/5 px-7 py-2 text-sm">
          Die Einteilung wurde am {publishedNotice} veröffentlicht und ist
          endgültig.
        </p>
      ) : null}

      {total === 0 && divisions.length === 0 ? (
        <div className="flex-1 overflow-auto">
          <p className="px-7 py-4 text-muted-foreground text-sm">
            Keine Anmeldungen für diese Saison.
          </p>
        </div>
      ) : (
        <SeedingSheet
          rows={rows}
          divisions={divisions}
          subDivisions={subDivisions}
          selection={selection}
          readOnly={published}
          generatingDivisionId={generatingDivisionId}
          onGenerate={onGenerate}
          onToggleSelect={onToggleSelect}
          onAssignDivision={onAssignDivision}
          onMoveGroup={onMoveGroup}
          onPlace={onPlace}
        />
      )}

      {published ? null : (
        <BulkBar
          count={selection.size}
          divisions={divisions}
          onAssign={onBulkAssign}
          onClear={() => setSelection(new Set())}
        />
      )}
    </div>
  );
}

// Shown while the lazy auto-init sorts returning players into their divisions.
export function SeedingInitLoader() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-6 animate-spin text-brand-orange" />
      <p className="text-sm">Spieler werden in die Divisionen eingeteilt…</p>
    </div>
  );
}
