
export default function Page() {
  return (
    <div className="relative  flex min-h-screen items-center justify-center bg-[#F7FBF0]">

        <h1 className="absolute font-montserrat top-10 text-3xl text-[#006600] font-bold text-center z-10">KUQUEST</h1>
    
        <div className="absolute -top-60 -right-10 w-96 h-96 bg-[#ACF597] blur-[200px] rounded-full z-10" />
        <div className="absolute -bottom-60 -left-2 w-96 h-96 bg-[#ACF597] blur-[200px] rounded-full -z+10" />

        <section className="relative space-y-4 rounded-xl border p-20 bg-white drop-shadow-md shadow-xl shadow-green-200/30">
          
          <div className="mx-auto flex items-center justify-center w-18 h-18 bg-[#004B00]/10 rounded-full z-10">
            <svg width="36" height="40" viewBox="0 0 36 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M26 40C23.2333 40 20.875 39.025 18.925 37.075C16.975 35.125 16 32.7667 16 30C16 27.2333 16.975 24.875 18.925 22.925C20.875 20.975 23.2333 20 26 20C28.7667 20 31.125 20.975 33.075 22.925C35.025 24.875 36 27.2333 36 30C36 32.7667 35.025 35.125 33.075 37.075C31.125 39.025 28.7667 40 26 40ZM16 40C11.3667 38.8333 7.54167 36.175 4.525 32.025C1.50833 27.875 0 23.2667 0 18.2V6L16 0L32 6V17.35C31.1333 16.9167 30.1583 16.5833 29.075 16.35C27.9917 16.1167 26.9667 16 26 16C22.1333 16 18.8333 17.3667 16.1 20.1C13.3667 22.8333 12 26.1333 12 30C12 32.0667 12.3917 33.9333 13.175 35.6C13.9583 37.2667 14.95 38.7167 16.15 39.95C16.1167 39.95 16.0917 39.9583 16.075 39.975C16.0583 39.9917 16.0333 40 16 40ZM26 30C26.8333 30 27.5417 29.7083 28.125 29.125C28.7083 28.5417 29 27.8333 29 27C29 26.1667 28.7083 25.4583 28.125 24.875C27.5417 24.2917 26.8333 24 26 24C25.1667 24 24.4583 24.2917 23.875 24.875C23.2917 25.4583 23 26.1667 23 27C23 27.8333 23.2917 28.5417 23.875 29.125C24.4583 29.7083 25.1667 30 26 30ZM26 36C27.0333 36 27.9833 35.7583 28.85 35.275C29.7167 34.7917 30.4167 34.15 30.95 33.35C30.2167 32.9167 29.4333 32.5833 28.6 32.35C27.7667 32.1167 26.9 32 26 32C25.1 32 24.2333 32.1167 23.4 32.35C22.5667 32.5833 21.7833 32.9167 21.05 33.35C21.5833 34.15 22.2833 34.7917 23.15 35.275C24.0167 35.7583 24.9667 36 26 36Z" fill="#006600"/>
            </svg>
          </div>
          

          <h1 className="text-3xl text-[#003200] text-center font-montserrat font-bold">Admin Portal</h1>
          <h3 className="text-sm text-center  text-[#41493D] font-montserrat"> Restricted access for authorized <br/> personnel only</h3>
        
          <button
            //onClick={handleSignIn}
            className=" cursor-pointer  flex items-center mx-auto gap-3 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 transition"
            >
            <svg width="24" height="24" viewBox="0 0 48 48">
                {/* Google G logo path - หาได้จาก Google's official brand assets */}
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            Sign in with Google
        </button>

          <hr className="h-px my-8 bg-gray-200 border-1"></hr>
        
        </section>

  

    </div>
  );
}