import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
      <h1 className="text-5xl font-extrabold tracking-tight">Class Pulse</h1>
      <p className="mt-1 text-2xl text-slate-500" dir="rtl" lang="ar">نبض الصف</p>
      <p className="mt-4 text-lg text-slate-600">
        Students tap how well they are following while you teach. You see the class understanding live and where the class got lost, so you can slow down or repeat without anyone raising a hand.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link to="/teacher" className="rounded-2xl bg-indigo-600 p-6 text-white shadow-sm transition hover:bg-indigo-700">
          <div className="text-xl font-bold">I'm a teacher</div>
          <div className="mt-1 text-indigo-100">Start a class and get a join code</div>
        </Link>
        <Link to="/join" className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-300 transition hover:bg-slate-50">
          <div className="text-xl font-bold">I'm a student</div>
          <div className="mt-1 text-slate-500">Join with the code on the board</div>
        </Link>
      </div>
    </main>
  );
}
