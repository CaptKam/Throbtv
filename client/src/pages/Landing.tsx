import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Play, Mail, Lock, ArrowRight, ChevronRight, Zap, Smartphone, Monitor, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const FEATURES = [
  { icon: ListOrdered, label: "Auto-advance queue" },
  { icon: Smartphone, label: "Phone remote" },
  { icon: Monitor, label: "Theater mode" },
  { icon: Zap, label: "Instant streaming" },
];

const STEPS = [
  { num: "1", title: "Sign up free", desc: "Create an account in seconds — no credit card needed." },
  { num: "2", title: "Build your queue", desc: "Browse, search, and add videos. Drag to reorder." },
  { num: "3", title: "Sit back & watch", desc: "Videos auto-advance hands-free. Use your phone as a remote." },
];

export default function Landing() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, register, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) setLocation("/discover");
  }, [isAuthenticated, setLocation]);

  const isLoading = login.isPending || register.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mutation = isLogin ? login : register;
    mutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          toast({
            title: isLogin ? "Welcome back!" : "Account created successfully",
            description: "Redirecting to your queue...",
          });
        },
        onError: (error: Error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10 mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-blue-900/20 rounded-full blur-[150px] -z-10 mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* ======= NAV ======= */}
      <nav className="relative z-10 w-full px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-red-700 flex items-center justify-center shadow-lg shadow-primary/20">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
          <span className="text-2xl font-black tracking-tighter">throb<span className="text-muted-foreground">.</span><span className="text-primary">tv</span></span>
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground hidden sm:flex" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
            How it works
          </Button>
          <Button variant="ghost" onClick={() => setIsLogin(true)}>
            Log in
          </Button>
        </div>
      </nav>

      {/* ======= HERO ======= */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center max-w-7xl mx-auto px-6 py-12 gap-16 lg:gap-24 w-full">
        <div className="flex-1 flex flex-col items-start text-left">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl lg:text-7xl font-black leading-[1.1] mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/60"
          >
            Your queue.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-red-400">Your zone.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg lg:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed"
          >
            Browse, queue up, and watch hands-free with auto-advance. Sync your phone as a remote.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap gap-3 mb-10"
          >
            {FEATURES.map((f) => (
              <div key={f.label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-muted-foreground backdrop-blur-md">
                <f.icon className="w-4 h-4 text-primary" />
                {f.label}
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button
              size="lg"
              onClick={() => setIsLogin(false)}
              className="h-14 px-10 text-base font-semibold rounded-full bg-primary hover:bg-primary/90 text-white shadow-[0_0_30px_-5px_rgba(239,68,68,0.5)] transition-all"
            >
              Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>

        {/* ======= AUTH CARD ======= */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-red-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

              <div className="flex gap-4 mb-8">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`text-lg font-semibold pb-2 transition-colors relative ${isLogin ? 'text-white' : 'text-muted-foreground hover:text-white/80'}`}
                  data-testid="tab-login"
                >
                  Log In
                  {isLogin && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`text-lg font-semibold pb-2 transition-colors relative ${!isLogin ? 'text-white' : 'text-muted-foreground hover:text-white/80'}`}
                  data-testid="tab-signup"
                >
                  Sign Up
                  {!isLogin && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/80 font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-black/50 border-white/10 focus-visible:ring-primary text-white placeholder:text-muted-foreground/50 rounded-xl"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-white/80 font-medium">Password</Label>
                    {isLogin && (
                      <a href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">Forgot password?</a>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 bg-black/50 border-white/10 focus-visible:ring-primary text-white placeholder:text-muted-foreground/50 rounded-xl"
                      data-testid="input-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 mt-4 text-base font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)] transition-all"
                  data-testid="button-submit"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {isLogin ? "Logging in..." : "Creating account..."}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full relative">
                      <span>{isLogin ? <>Continue to throb<span className="text-muted-foreground">.</span><span className="text-primary">tv</span></> : "Create Account"}</span>
                      <ChevronRight className="w-5 h-5 absolute right-2" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center text-xs text-muted-foreground">
                By continuing, you agree to our <Link href="/legal/terms" className="text-white hover:underline">Terms of Service</Link> and <Link href="/legal/privacy" className="text-white hover:underline">Privacy Policy</Link>.
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ======= HOW IT WORKS ======= */}
      <section id="how-it-works" className="relative z-10 max-w-5xl mx-auto px-6 py-24 w-full">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl lg:text-4xl font-black text-center mb-16 tracking-tight text-white"
        >
          How it works
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                <span className="text-xl font-black text-primary">{s.num}</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ======= FOOTER ======= */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span className="font-bold tracking-tighter text-sm">throb<span className="text-muted-foreground">.</span><span className="text-primary">tv</span></span>
          <div className="flex gap-6">
            <Link href="/legal/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/legal/dmca" className="hover:text-white transition-colors">DMCA</Link>
            <Link href="/legal/2257" className="hover:text-white transition-colors">18 U.S.C. § 2257</Link>
          </div>
          <span>&copy; {new Date().getFullYear()} throb.tv</span>
        </div>
      </footer>
    </div>
  );
}
