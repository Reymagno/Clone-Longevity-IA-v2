import { redirect } from 'next/navigation'

export default function PatientPage({ params }: { params: { id: string } }) {
  redirect(`/patients/${params.id}/dashboard`)
}
