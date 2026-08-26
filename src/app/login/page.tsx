"use client";
import { useState } from "react";

import { ProtectIcon } from "../components/icons/protect";


export function Placeholder({ isOpen, onClose }) {
  if (!isOpen) return null; // ไม่เปิด ก็ไม่ render อะไรเลย

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative space-y-4 rounded-xl border p-20 bg-black"
      >
        <h1 className="text-3xl text-white text-center font-montserrat font-bold">test</h1>
        <button onClick={onClose} className="cursor-pointer absolute top-4 right-4 text-white">
          X
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    // TODO: replace with your actual auth logic
    console.log("Logging in with:", { username, password });
  };

  return (
    <div className="relative  flex min-h-screen items-center justify-center bg-[#F7FBF0] overflow-hidden">

        <h1 className="absolute font-montserrat top-10 text-3xl text-[#006600] font-bold text-center z-10">KUQUEST</h1>
    
        <div className="absolute -top-60 -right-10 w-96 h-96 bg-[#ACF597] blur-[200px] rounded-full z-10" />
        <div className="absolute -bottom-60 -left-2 w-96 h-96 bg-[#ACF597] blur-[200px] rounded-full -z+10" />

        <section className="relative space-y-4 rounded-xl border p-20 bg-white drop-shadow-md shadow-xl shadow-green-200/30">
          
          <div className="mx-auto flex items-center justify-center w-18 h-18 bg-[#004B00]/10 rounded-full z-10">
            <ProtectIcon/>
          </div>
          

          <h1 className="text-3xl text-[#003200] text-center font-montserrat font-bold">Admin Portal</h1>
          <h3 className="text-sm text-center  text-[#41493D] font-montserrat"> Restricted access for authorized <br/> personnel only</h3>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#006600]/40 focus:border-[#006600]"
                required
              />
            </div>

            <div className="space-y-1">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#006600]/40 focus:border-[#006600]"
                required
              />
            </div>

            <button
              type="submit"
              className="cursor-pointer w-full rounded-lg bg-[#006600] px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#004B00] transition"
            >
              Sign in
            </button>
          </form>

          <hr className="h-px my-8 bg-gray-200 border-1"></hr>
        
        </section>

      <Placeholder isOpen={isOpen} onClose={() => setIsOpen(false)} />

    </div>
  );
}