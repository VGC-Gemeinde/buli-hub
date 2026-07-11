"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  type DivisionRef,
  type Placement,
  type SheetRow,
  type SubDivisionRef,
  UNPLACED_SECTION,
} from "../sheet";
import {
  DivisionSeparator,
  EmptyDivisionHint,
  PlayerRow,
  SheetColumnHeader,
  SubDivisionSeparator,
  UngroupedSeparator,
  UnplacedSeparator,
} from "./sheet-rows";

const RING = "shadow-[inset_0_0_0_1.5px] shadow-brand-orange";
const BOTTOM_LINE = "shadow-[inset_0_-2px_0_0] shadow-brand-orange";

export function SeedingSheet({
  rows,
  divisions,
  subDivisions,
  selection,
  readOnly,
  finalized,
  generatingDivisionId,
  onGenerate,
  onToggleSelect,
  onToggleCollapse,
  onAssignDivision,
  onMoveGroup,
  onPlace,
}: {
  rows: SheetRow[];
  divisions: DivisionRef[];
  subDivisions: SubDivisionRef[];
  selection: Set<string>;
  readOnly: boolean;
  finalized: boolean;
  generatingDivisionId: string | null;
  onGenerate: (divisionId: string) => void;
  onToggleSelect: (userId: string) => void;
  onToggleCollapse: (id: string) => void;
  onAssignDivision: (userId: string, divisionId: string | null) => void;
  onMoveGroup: (userId: string, subDivisionId: string) => void;
  onPlace: (userIds: string[], placement: Placement) => void;
}) {
  // Which player(s) are being dragged, and which drop zone is currently hovered.
  const [dragIds, setDragIds] = useState<string[] | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);

  // Drag source props for a player row — dragging a selected row carries the
  // whole selection.
  function source(userId: string) {
    if (readOnly) {
      return {};
    }
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        const ids =
          selection.has(userId) && selection.size > 0
            ? [...selection]
            : [userId];
        setDragIds(ids);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", ids.join(","));
      },
      onDragEnd: () => {
        setDragIds(null);
        setDropKey(null);
      },
    };
  }

  // Drop zone props for any row. `highlight` is the ring for separators or the
  // bottom line for player rows.
  function zone(key: string, placement: Placement, highlight: string) {
    if (readOnly) {
      return { className: undefined as string | undefined };
    }
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!dragIds) {
          return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropKey(key);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        if (dragIds) {
          onPlace(dragIds, placement);
        }
        setDragIds(null);
        setDropKey(null);
      },
      className: dropKey === key ? highlight : undefined,
    };
  }

  function subDivisionPlacement(subDivisionId: string): Placement {
    const divisionId =
      subDivisions.find((sd) => sd.id === subDivisionId)?.divisionId ?? null;
    return { divisionId, subDivisionId };
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <SheetColumnHeader />
      {rows.map((row) => {
        switch (row.kind) {
          case "unplaced": {
            const drop = zone(
              "unplaced",
              { divisionId: null, subDivisionId: null },
              RING,
            );
            return (
              <div key="unplaced" {...drop}>
                <UnplacedSeparator
                  count={row.count}
                  collapsed={row.collapsed}
                  onToggle={() => onToggleCollapse(UNPLACED_SECTION)}
                />
              </div>
            );
          }
          case "division": {
            const drop = zone(
              `div-${row.division.id}`,
              { divisionId: row.division.id, subDivisionId: null },
              RING,
            );
            return (
              <div key={`div-${row.division.id}`} {...drop}>
                <DivisionSeparator
                  division={row.division}
                  count={row.count}
                  groupCount={row.groupCount}
                  hasGroups={row.hasGroups}
                  size={row.size}
                  collapsed={row.collapsed}
                  readOnly={readOnly}
                  pending={generatingDivisionId === row.division.id}
                  onToggleCollapse={onToggleCollapse}
                  onGenerate={onGenerate}
                />
              </div>
            );
          }
          case "subdivision": {
            const drop = zone(
              `sub-${row.subDivisionId}`,
              subDivisionPlacement(row.subDivisionId),
              RING,
            );
            return (
              <div key={`sub-${row.subDivisionId}`} {...drop}>
                <SubDivisionSeparator
                  tier={row.tier}
                  position={row.position}
                  subDivisionId={row.subDivisionId}
                  count={row.count}
                  showdown={row.showdown}
                  cartridge={row.cartridge}
                  collapsed={row.collapsed}
                  onToggleCollapse={onToggleCollapse}
                />
              </div>
            );
          }
          case "ungrouped": {
            const drop = zone(
              `ung-${row.divisionId}`,
              { divisionId: row.divisionId, subDivisionId: null },
              RING,
            );
            return (
              <div key={`ung-${row.divisionId}`} {...drop}>
                <UngroupedSeparator count={row.count} />
              </div>
            );
          }
          case "empty-division": {
            const drop = zone(
              `empty-${row.divisionId}`,
              { divisionId: row.divisionId, subDivisionId: null },
              RING,
            );
            return (
              <div key={`empty-${row.divisionId}`} {...drop}>
                <EmptyDivisionHint />
              </div>
            );
          }
          case "player": {
            const p = row.player;
            const drag = source(p.userId);
            const drop = zone(
              `p-${p.userId}`,
              { divisionId: p.divisionId, subDivisionId: p.subDivisionId },
              BOTTOM_LINE,
            );
            return (
              <div
                key={p.userId}
                {...drag}
                {...drop}
                className={cn(
                  !readOnly && "cursor-grab select-none",
                  drop.className,
                )}
              >
                <PlayerRow
                  player={p}
                  divisions={divisions}
                  subDivisions={subDivisions}
                  selected={selection.has(p.userId)}
                  readOnly={readOnly}
                  finalized={finalized}
                  onToggleSelect={onToggleSelect}
                  onAssignDivision={onAssignDivision}
                  onMoveGroup={onMoveGroup}
                />
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
