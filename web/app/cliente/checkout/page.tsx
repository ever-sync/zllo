import { createClient } from '@/lib/supabase/server';
import { profileAddress } from '@/lib/profile-address';
import { ClientShell } from '../client-shell';
import { CheckoutClient } from './checkout-client';

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase.rpc('get_my_profile');

  return (
    <ClientShell>
      <CheckoutClient defaultAddress={profileAddress(profile)} />
    </ClientShell>
  );
}
