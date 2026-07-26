"use client";
import { useSession } from "@/lib/auth-client";

export default function Page() {
  const { data, isPending, error } = useSession();

  console.log("session data:", data);
  console.log("isPending:", isPending);
  console.log("error:", error);

  return (
    <div>
      <p>Session test - เปิด console ดูผล</p>
    </div>
  );
}