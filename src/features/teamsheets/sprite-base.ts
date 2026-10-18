// The root of the public sprite bucket, on its own so code that only needs a
// URL (the type icons) does not pull in sprites.ts and with it @pkmn/dex.
export const SPRITE_BASE =
  process.env.NEXT_PUBLIC_SPRITE_BASE ||
  "https://storage.googleapis.com/justhit-sprites";
