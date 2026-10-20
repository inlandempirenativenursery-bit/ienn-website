# Usability notes and recommendations (IENN tool + website)

## Concerns
1. **Weekly counts vs. the Sold ledger.** Available = this week's counts − this week's sales.
   - If someone recounts mid-week after plants were sold, those sales are subtracted again from the new, already-lower count. Today, a re-submission in the **same** week replaces only that person's earlier row, so the sales still count against it.
   - **Decide:** either a recount means "stock now" (and the week's sales should reset), or counts are only taken at the start of the week. Recommendation: one counting day (e.g., Monday), with a recount only via a "Start new week" button that resets the baseline on purpose.
2. **Who resets the week.** Right now the reset is implicit: the first submission in a new ISO week. Pick one owner (e.g., Eric) and one day.
3. **Partial counts.** If only one of several counters has submitted for a new week, stock drops to that person's numbers until the others submit. Consider "week complete" as all expected counters having submitted, or carry over plants that weren't counted.
4. **Two order pages.** The website `order.html` and the tool's `?view=customer` both create invoices. Keep **one public entry point** (the website) and treat `?view=customer` as the staff walk-up/phone form, or retire it.
5. **The mailto fallback.** If the Apps Script POST fails, customers get an email draft. Many phones have no mail app set up, so those orders would be lost silently. Once the POST is deployed and tested, replace the fallback with "Couldn't send — please text/call <number>" or a retry.
6. **Team email recipients.** The existing tool sends to the team emails saved via `saveTeamEmails`. Confirm that Eric, Andrew, Keith and Raylene are all on it. The repo contains no addresses on purpose.
7. **Reply ownership.** Everyone gets the email, so two people could reply. Use one rule: claim the order by putting your name in its row before replying. A simple "Handled by" column in Invoices would make this visible.
8. **Tax display.** The tool treats prices as tax-included (backing 8.75% out of the total). The website shows the same thing ("Tax 8.75% (included)"). If Eric wants tax **added** on top, this must change in both places at once.
9. **Sizes.** Counts only track 4" and 1 gal (`four`, `gal1`). 2" and Tree pot have prices but no counts, so they never show as in stock. Add count keys, or hide those prices until they're needed.
10. **Name matching.** Stock is matched to invoice lines by common name (the part before "("). Two Catalog plants with the same common name would collide. Keep common names unique.
11. **Public views.** `?view=inventory` and `?view=printlist` are public by design (stock only). `?view=reply` shows customer details and requires `ADMIN_KEY`; don't paste reply links into public places.

## Simplifications recommended
- One nav bar in the tool (`IndexNav.html`): Weekly count · Invoices / orders · Print plant list · Website stock preview. Remove other ad-hoc links.
- One public order page (the website). One reply template. One person per order.
- Show a "Stock as of <week>, counted by <names>" line in the tool, so everyone knows which week's counts are live.
