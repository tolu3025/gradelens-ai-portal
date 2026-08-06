## Plan

1. **Make Vercel use the correct server output**
   - Add a Vercel deployment config so Vercel does not treat the app like a static-only site.
   - Ensure the build runs with the Vercel server preset automatically.
   - Keep the output directory aligned with TanStack Start/Nitro’s `.vercel/output` build.

2. **Fix route aliases for the student list page**
   - Keep the existing admin student list route at `/admin-students`.
   - Add a friendly `/student-list` route that redirects to `/admin-students`, so links typed as “student list” won’t show page-not-found.
   - If needed, also add `/students` as an alias to the same admin list.

3. **Improve deployed fallback behavior**
   - Confirm root not-found/error handling is wired so app-level missing routes show the portal’s own page instead of a blank screen.
   - Keep deep-link refreshes handled by the server render path rather than SPA rewrite hacks.

4. **Check the preview signal after changes**
   - Verify the preview loads locally and the known routes exist: `/`, `/auth`, `/admin-students`, and the new alias route(s).

## Technical notes

- The screenshot is Vercel’s platform-level `404: NOT_FOUND`, which usually means Vercel did not detect or serve the generated server output, not that the React page itself rendered a 404.
- The current route tree already includes `/admin-students`; the missing “student list” issue is likely a URL mismatch such as `/student-list` or `/students`.
- I will not edit `src/routeTree.gen.ts` directly; TanStack regenerates it from route files.