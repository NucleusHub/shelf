// Thin re-export of the shared @core server auth (core/server/auth.js), reached
// via the committed `server/core` symlink + the `/app/core` container mount.
// Kept as a stable local path so this app's route imports (`../middleware/auth.js`)
// stay unchanged if the shared implementation moves.
export { requireAuth, verifyToken, verifyProfile } from '../core/server/auth.js'
