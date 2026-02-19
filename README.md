

## Problems

#### Problem: When I deleted a bookmark in one tab, it disappeared from that tab instantly but the other tab still showed it until I refreshed the page.
`
Why it happened: I was using a single real-time listener for all events (event: '*'), but Supabase's DELETE event doesn't include the full row data the same way INSERT does — so the other tab had no way of knowing which bookmark was removed.
How I fixed it: I split the real-time listener into two separate ones — one for INSERT and one for DELETE. The DELETE listener receives a payload.old object which contains the ID of the deleted row. I used that ID to instantly filter it out from the list on the other tab without needing to refresh.
`