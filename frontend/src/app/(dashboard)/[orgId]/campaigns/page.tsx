import { redirect } from 'next/navigation';

export default async function CampaignsRedirect({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/${orgId}`);
}
