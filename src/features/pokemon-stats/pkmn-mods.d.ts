// @pkmn/mods ships its subpath types beside the builds but not through its
// package.json "exports", so TypeScript cannot resolve them (the package's
// README documents the gap). The mod data is cast to `ModData` where it is
// used (move-card.ts), so an untyped module is all that is needed.
declare module "@pkmn/mods/champions";
