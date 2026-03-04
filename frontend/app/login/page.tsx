"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BotMessageSquare, Mail, Lock, ArrowRight, Github, Chrome } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await login({ email, password });
            router.push("/");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Đăng nhập thất bại";
            if (errorMessage.includes("401") || errorMessage.includes("Invalid credentials")) {
                setError("Email hoặc mật khẩu không đúng.");
            } else if (errorMessage.includes("403") || errorMessage.includes("inactive")) {
                setError("Tài khoản của bạn đã bị vô hiệu hóa.");
            } else {
                setError("Đã xảy ra lỗi. Vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    }, [email, password, login, router]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Dynamic Background Gradients */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
            <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

            {/* Subtle Grid Pattern */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

            <div className="relative w-full max-w-md">
                {/* Glassmorphism Card */}
                <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 rounded-3xl p-8 shadow-2xl shadow-indigo-500/10">

                    {/* Header */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 animate-bounce-slow">
                            <BotMessageSquare size={32} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Chào mừng trở lại!</h1>
                        <p className="text-slate-400 text-sm mt-1">Đăng nhập để tiếp tục với VNG Multi-Agent</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2.5 px-4 rounded-xl animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Email Field */}
                            <div className="group">
                                <label className="text-xs font-medium text-slate-400 ml-1 mb-1.5 block group-focus-within:text-indigo-400 transition-colors">
                                    Email
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@vng.com.vn"
                                        className="w-full bg-slate-800/30 border border-slate-700/50 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-300"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="group">
                                <div className="flex justify-between items-center ml-1 mb-1.5">
                                    <label className="text-xs font-medium text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                                        Mật khẩu
                                    </label>
                                    <Link href="#" className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors">
                                        Quên mật khẩu?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-800/30 border border-slate-700/50 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-300"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl py-3.5 flex items-center justify-center gap-2 group transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Tiếp tục</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-8 flex items-center gap-4">
                        <div className="h-px flex-1 bg-slate-800/50" />
                        <span className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold">Hoặc tiếp tục với</span>
                        <div className="h-px flex-1 bg-slate-800/50" />
                    </div>

                    {/* Social Logins */}
                    <div className="grid grid-cols-2 gap-4">
                        <button className="flex items-center justify-center gap-2 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 text-xs text-slate-300 font-medium transition-all duration-300 active:scale-95">
                            <Chrome size={16} />
                            <span>Google</span>
                        </button>
                        <button className="flex items-center justify-center gap-2 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 text-xs text-slate-300 font-medium transition-all duration-300 active:scale-95">
                            <Github size={16} />
                            <span>Github</span>
                        </button>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-slate-500 mt-8">
                        Chưa có tài khoản?{" "}
                        <Link href="/register" className="text-indigo-400 font-medium hover:underline decoration-indigo-400/30 underline-offset-4 transition-all">
                            Tạo tài khoản mới
                        </Link>
                    </p>
                </div>
            </div>

            <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-5%); }
          50% { transform: translateY(0); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
        </div>
    );
}
