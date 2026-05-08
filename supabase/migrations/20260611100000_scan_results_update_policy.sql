-- Allow authenticated users to update their own scan rows (e.g. qualitative fields later).
drop policy if exists "Users can update own scans" on public.scan_results;
create policy "Users can update own scans"
on public.scan_results for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
