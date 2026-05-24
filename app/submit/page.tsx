import { getServerSupabase } from "@/lib/supabase/server";
import SubmitForm from "./SubmitForm";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold mb-2">Sign in to submit</h1>
        <p className="text-neutral-500">
          You must be signed in to submit a piece of bad design. Use the Sign in button in the header.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Submit Bad Design</h1>
      <p className="text-neutral-500 mb-6">
        Upload a photo, give it a title, and our Chief Roast Officer (AI) will roast it.
      </p>
      <SubmitForm />
    </div>
  );
}

export const metadata = { title: "Submit — A Piece of Design" };
