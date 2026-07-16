import { redirect } from 'next/navigation';

export default function VendorDashboardIndex() {
  redirect('/vendor/catalog');
}
