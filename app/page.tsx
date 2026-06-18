"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Asterisk,
  Search,
  Bell,
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronRight,
  ArrowUpRight,
  ArrowUp,
  Check,
  CheckCircle,
  Calendar,
  ChevronLeft,
  User,
  Plus,
  Minus,
  AlertCircle,
  Sparkles,
  Clock,
  Coins,
  Lock,
  PieChart,
  Share2,
  Copy,
  Activity,
  ArrowDownRight,
  Sliders,
  DollarSign,
  Briefcase,
  Layers,
  FileText,
  Bookmark,
  Building,
  Cpu,
  X,
  Shield,
  UploadCloud,
  Download,
  Trash,
  Users,
  Eye,
  Settings,
  Pencil,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import dynamic from 'next/dynamic';

const TradingChart = dynamic(() => import("@/components/TradingChart"), { ssr: false });
const RevenueFinanceCard = dynamic(() => import("@/components/RevenueFinanceCard"), { ssr: false });
const ContractsTab = dynamic(() => import("@/components/ContractsTab"), { ssr: false });

import antaresAvatar from "@/src/assets/images/antares_avatar_1780093751751.png";
import {
  INITIAL_CHANNELS,
  INITIAL_HOLDINGS,
  INITIAL_ACTIVITY,
  ChannelTDA,
  PortfolioHolding,
  ActivityLog
} from "@/lib/marketData";

const formatNumber = (num: number, decimals?: number): string => {
  if (num === undefined || num === null || isNaN(num)) return "0";
  let str = decimals !== undefined ? num.toFixed(decimals) : num.toString();
  const parts = str.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts.join(",");
};

const NEWS_ITEMS: any[] = [];

const DEFAULT_TDA_REQUESTS: any[] = [];

export interface PlatformUser {
  id: string;
  email: string;
  walletAddress: string;
  tonBalance: number;
  usdtBalance: number;
  role: "super_admin" | "moderator" | "risk_analyst" | "financial_auditor" | "user";
  status: "active" | "banned";
  suspensionReason?: string;
  kycVerified: boolean;
  joinedDate: string;
}

export default function Home() {
  // Navigation: "market" | "portfolio" | "profile" | "contracts" | "admin"
  const [activeTab, setActiveTab ] = useState<"market" | "portfolio" | "profile" | "contracts" | "admin" | "settings" | "tda">("market");
  
  // Hydration tracking
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Language Selection State (automatic translate)
  const [language, setLanguage] = useState<"en" | "ru">("ru");

  const changeLanguage = (lang: "en" | "ru") => {
    setLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("mint_app_lang", lang);
    }
  };

  // Currency Selection State (TON or USDT)
  const [displayCurrency, setDisplayCurrency] = useState<"TON" | "USDT">("TON");

  const changeDisplayCurrency = (curr: "TON" | "USDT") => {
    setDisplayCurrency(curr);
    if (typeof window !== "undefined") {
      localStorage.setItem("mint_app_currency", curr);
    }
  };

  const [showSettingsInProfile, setShowSettingsInProfile] = useState<boolean>(false);

  // Translation helper function
  const t = (en: string, ru: string): string => {
    return language === "ru" ? ru : en;
  };

  const getRemainingTimeFormatted = (endTime?: number) => {
    if (!endTime) return "";
    const remainingMs = endTime - currentTime;
    if (remainingMs <= 0) return language === "ru" ? "Завершено" : "Ended";
    
    const h = Math.floor(remainingMs / 3600000).toString().padStart(2, '0');
    const m = Math.floor((remainingMs % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getStartDateFormatted = (endTime?: number, countdownHours?: number) => {
    if (!endTime || !countdownHours) return "";
    const startMs = endTime - (countdownHours * 3600000);
    return new Date(startMs).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  
  const getEndDateFormatted = (endTime?: number) => {
    if (!endTime) return "";
    return new Date(endTime).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Market filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [marketSegment, setMarketSegment] = useState<"All" | "TDA" | "Secondary">("All");
  const [sortBy, setSortBy] = useState<"name" | "price" | "change" | "subs">("name");

  // Global State
  const [tonBalance, setTonBalance] = useState<number>(0.0);
  const [usdtBalance, setUsdtBalance] = useState<number>(0.0);

  const TON_TO_USD = 1.0;
  
  // Load channels static initially to support perfect SSR hydration
  const [channels, setChannels] = useState<ChannelTDA[]>(INITIAL_CHANNELS);

  // Admin and Moderation Requests state
  const [tdaRequests, setTdaRequests] = useState<any[]>([]);

  // Interactive News slider index
  const [currentNewsIndex, setCurrentNewsIndex] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<number>(1); // 1 = forward, -1 = backward
  const [newsList, setNewsList] = useState<any[]>(NEWS_ITEMS);
  const [isNewsAutoplay, setIsNewsAutoplay] = useState<boolean>(true);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<boolean>(false);
  const [isHoveringNews, setIsHoveringNews] = useState<boolean>(false);
  const [lastManualInteract, setLastManualInteract] = useState<number>(0);
  const [dragX, setDragX] = useState<number>(0);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragDirectionLocked, setDragDirectionLocked] = useState<"none" | "horizontal" | "vertical">("none");
  const [isPanningNews, setIsPanningNews] = useState<boolean>(false);

  // Admin access control (Always enabled by default for developer owner)
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Administrative aspect and role (switchable in control deck)
  const [adminRole, setAdminRole] = useState<"super_admin" | "moderator" | "risk_analyst" | "financial_auditor">("super_admin");

  // System safety settings block
  const [systemSettings, setSystemSettings] = useState({
    tradingHalted: false,
    depositsFrozen: false,
    maxSingleTradeTon: 2000,
    tdaSubmissionLimit: false,
  });

  // system system database
  const [users, setUsers] = useState<PlatformUser[]>([
    {
      id: "user_current",
      email: "tairabdyukaev1980@gmail.com",
      walletAddress: "EQB_tair_dyukaev_1980_compliant_ton_address",
      tonBalance: 0.0,
      usdtBalance: 0.0,
      role: "super_admin",
      status: "active",
      kycVerified: true,
      joinedDate: "2026-05-20"
    }
  ]);

  // Sub Tab selections inside improved Admin UI
  const [adminSubTab, setAdminSubTab] = useState<"applications" | "database" | "safety" | "minting" | "news">("applications");

  // Admin access control & security passcode states
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("ton_admin_auth_passed_v5") === "true";
    }
    return false;
  });
  const [adminPasscode, setAdminPasscode] = useState<string>("");
  const [passcodeError, setPasscodeError] = useState<boolean>(false);

  // Blockchain system status states
  const [blockchainSimBlockHeight, setBlockchainSimBlockHeight] = useState<number>(10432581);
  const [blockchainSimLatency, setBlockchainSimLatency] = useState<number>(1.6);
  const [blockchainSimValidators, setBlockchainSimValidators] = useState<number>(42);

  // New manual minting state fields
  const [newChanName, setNewChanName] = useState<string>("");
  const [newChanHandle, setNewChanHandle] = useState<string>("");
  const [newChanPrice, setNewChanPrice] = useState<string>("0.25");
  const [newChanSupply, setNewChanSupply] = useState<string>("1000000");
  const [newChanYield, setNewChanYield] = useState<string>("14.0");
  const [newChanCategory, setNewChanCategory] = useState<string>("Finance");
  const [isMintingInLoadingState, setIsMintingInLoadingState] = useState<boolean>(false);
  const [mintingCompilationStep, setMintingCompilationStep] = useState<number>(0);

  // Airdrop state fields
  const [airdropAmount, setAirdropAmount] = useState<string>("1500");
  const [airdropTarget, setAirdropTarget] = useState<"all" | "active" | "super">("all");
  const [isAirdropInProgress, setIsAirdropInProgress] = useState<boolean>(false);

  // Platform Fee Variable State & accumulated pool
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(1.5);
  const [accumulatedReservePool, setAccumulatedReservePool] = useState<number>(0.0);

  // system helper trigger for blockchain increment ticker
  useEffect(() => {
    if (!isHydrated) return;
    const interval = setInterval(() => {
      setBlockchainSimBlockHeight((prev) => prev + 1);
      setBlockchainSimLatency(() => parseFloat((1.2 + Math.random() * 0.9).toFixed(2)));
    }, 5000);
    return () => clearInterval(interval);
  }, [isHydrated]);

  // Input controller for security PIN — verified server-side
  const handlePINInput = (num: string) => {
    if (adminPasscode.length >= 4) return;
    const nextPIN = adminPasscode + num;
    setAdminPasscode(nextPIN);
    
    if (nextPIN.length === 4) {
      fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: nextPIN }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setIsAdminAuthenticated(true);
            if (typeof window !== "undefined") {
              sessionStorage.setItem("ton_admin_auth_passed_v5", "true");
            }
          } else {
            setPasscodeError(true);
            setTimeout(() => {
              setPasscodeError(false);
              setAdminPasscode("");
            }, 800);
          }
        })
        .catch(() => {
          setPasscodeError(true);
          setTimeout(() => {
            setPasscodeError(false);
            setAdminPasscode("");
          }, 800);
        });
    }
  };

  // Selection state inside Database explorer
  const [dbSelectedTable, setDbSelectedTable] = useState<"users" | "channels" | "audit">("users");

  // Selection states for manual database records editing
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserTon, setEditUserTon] = useState<string>("");
  const [editUserUsdt, setEditUserUsdt] = useState<string>("");
  const [editUserRole, setEditUserRole] = useState<string>("");
  const [editUserStatus, setEditUserStatus] = useState<string>("");
  const [editUserReason, setEditUserReason] = useState<string>("");

  // Form states for submitting new moderation request
  const [submitTdaName, setSubmitTdaName] = useState("");
  const [submitTdaHandle, setSubmitTdaHandle] = useState("");
  const [submitTdaSubscribers, setSubmitTdaSubscribers] = useState("");
  const [submitTdaViews, setSubmitTdaViews] = useState("");
  const [submitTdaRevenue, setSubmitTdaRevenue] = useState("");
  const [submitTdaAge, setSubmitTdaAge] = useState("2");
  const [submitTdaStats, setSubmitTdaStats] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFileSize, setUploadedFileSize] = useState("");
  const [uploadedFileBase64, setUploadedFileBase64] = useState("");
  const [fileIsPdf, setFileIsPdf] = useState(false);
  const [appSubmissionStatus, setAppSubmissionStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [tdaMode, setTdaMode] = useState<"apply" | "wizard">("apply");

  // Admin interaction UI states
  const [expandedProofId, setExpandedProofId] = useState<string | null>(null);
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [singleRejectReason, setSingleRejectReason] = useState<string>("");

  // States for the Acton deploy interface configured by chief admin
  const [adminDeployingReqId, setAdminDeployingReqId] = useState<string | null>(null);
  const [adminSharesSupply, setAdminSharesSupply] = useState<number>(5000000);
  const [adminSharePrice, setAdminSharePrice] = useState<number>(0.05);
  const [adminDurationHours, setAdminDurationHours] = useState<number>(72);
  const [isCompilingActon, setIsCompilingActon] = useState<boolean>(false);
  const [actonCompilationStep, setActonCompilationStep] = useState<number>(0); // 0: Idle, 1: Validating, 2: Compiling, 3: Deploying, 4: Confirmed!
  const [adminActiveCodeTab, setAdminActiveCodeTab] = useState<"code" | "abi" | "config">("code");

  const [holdings, setHoldings] = useState<PortfolioHolding[]>(INITIAL_HOLDINGS);
  const [activity, setActivity] = useState<ActivityLog[]>(INITIAL_ACTIVITY);
  const [investorApplications, setInvestorApplications] = useState<any[]>([]); // User's TWA subscriptions

  // Wallet State
  const [tonConnectUI] = useTonConnectUI();
  const rawWalletAddress = useTonAddress();
  const walletConnected = !!rawWalletAddress;
  const walletAddress = rawWalletAddress || "";
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());
  const [showWalletEdit, setShowWalletEdit] = useState<boolean>(false);

  // Telegram Integration State
  const [telegramUser, setTelegramUser] = useState<{
    id: number;
    username: string;
    first_name: string;
    last_name?: string;
    photo_url?: string;
    is_mocked?: boolean;
  } | null>(null);

  const [bindAlertBanner, setBindAlertBanner] = useState<boolean>(false);
  const [coupledBot, setCoupledBot] = useState<{ username: string; first_name: string } | null>(null);

  // On layout mount, safely restore state items to components from localStorage
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("mint_app_lang") as "en" | "ru";
      if (savedLang && (savedLang === "en" || savedLang === "ru")) {
        setLanguage(savedLang);
      }
      const savedCurrency = localStorage.getItem("mint_app_currency") as "TON" | "USDT";
      if (savedCurrency && (savedCurrency === "TON" || savedCurrency === "USDT")) {
        setDisplayCurrency(savedCurrency);
      }
      const savedChannels = localStorage.getItem("ton_tda_channels_v5");
      if (savedChannels) {
        try {
          const parsed = JSON.parse(savedChannels);
          const migratedChannels = parsed.map((c: any) => {
            if (c.tdaProgress >= 0 && c.tdaProgress < 100) {
              return {
                ...c,
                tdaEndTime: c.tdaEndTime || Date.now() + ((c.countdownHours || 120) * 3600000),
                countdownHours: c.countdownHours || 120
              };
            }
            return c;
          });
          setChannels(migratedChannels);
        } catch (e) {
          console.error("Error reading saved channels", e);
        }
      }
      const savedReqs = localStorage.getItem("tda_applications_v5");
      if (savedReqs) {
        try {
          setTdaRequests(JSON.parse(savedReqs));
        } catch (e) {
          console.error("Error parsing applications", e);
        }
      }
      const savedBalance = localStorage.getItem("ton_balance_v5");
      if (savedBalance) {
        setTonBalance(parseFloat(savedBalance));
      }
      const savedUsdt = localStorage.getItem("usdt_balance_v5");
      if (savedUsdt) {
        setUsdtBalance(parseFloat(savedUsdt));
      }
      const savedHoldings = localStorage.getItem("ton_holdings_v5");
      if (savedHoldings) {
        try {
          setHoldings(JSON.parse(savedHoldings));
        } catch (e) {
          console.error("Error parsing saved holdings", e);
        }
      }
      const savedActivity = localStorage.getItem("ton_activity_v5");
      if (savedActivity) {
        try {
          setActivity(JSON.parse(savedActivity));
        } catch (e) {
          console.error("Error parsing saved activity logs", e);
        }
      }
      const savedAdminRole = localStorage.getItem("ton_admin_role_v5") as any;
      if (savedAdminRole) {
        setAdminRole(savedAdminRole);
      }
      const savedSettings = localStorage.getItem("ton_system_settings_v5");
      if (savedSettings) {
        try {
          setSystemSettings(JSON.parse(savedSettings));
        } catch (e) {
          console.error("Error parsing settings", e);
        }
      }
      const savedUsersList = localStorage.getItem("ton_system_users_v5");
      if (savedUsersList) {
        try {
          setUsers(JSON.parse(savedUsersList));
        } catch (e) {
          console.error("Error parsing users", e);
        }
      }
      const savedNewsList = localStorage.getItem("ton_news_list_v5");
      if (savedNewsList) {
        try {
          setNewsList(JSON.parse(savedNewsList));
        } catch (e) {
          console.error("Error parsing news list", e);
        }
      }
      const savedInvestorApps = localStorage.getItem("ton_investor_apps_v5");
      if (savedInvestorApps) {
        try {
          setInvestorApplications(JSON.parse(savedInvestorApps));
        } catch (e) {
          console.error("Error parsing investor apps", e);
        }
      }

      // Automatically bind / parse Telegram Account info on first entrance!
      let finalTgUser = null;
      const savedTgUser = localStorage.getItem("ton_telegram_user_v5");
      if (savedTgUser) {
        try {
          finalTgUser = JSON.parse(savedTgUser);
          if (finalTgUser && finalTgUser.photo_url && finalTgUser.photo_url.includes("unsplash.com")) {
            finalTgUser.photo_url = "https://picsum.photos/id/64/150/150";
            localStorage.setItem("ton_telegram_user_v5", JSON.stringify(finalTgUser));
          }
        } catch (e) {
          console.error("Error parsing saved Telegram user", e);
        }
      }

      const isLoggedOutExplicitly = localStorage.getItem("ton_telegram_logged_out") === "true";

      if (!finalTgUser) {
        // First entry login & auto-bind!
        const tgSDK = typeof window !== "undefined" ? ((window as any).Telegram?.WebApp || null) : null;
        if (tgSDK && tgSDK.initDataUnsafe?.user) {
          const rawUser = tgSDK.initDataUnsafe.user;
          finalTgUser = {
            id: rawUser.id,
            username: rawUser.username || `user_${rawUser.id}`,
            first_name: rawUser.first_name || "Telegram User",
            last_name: rawUser.last_name || "",
            photo_url: rawUser.photo_url || "",
            is_mocked: false,
          };
          localStorage.setItem("ton_telegram_user_v5", JSON.stringify(finalTgUser));
          setTelegramUser(finalTgUser);
          setBindAlertBanner(true);
        } else {
          setTelegramUser(null);
        }
      } else {
        setTelegramUser(finalTgUser);
      }
    }
    setIsHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Dynamic Webhook Activation and Bot Status Query on load
  useEffect(() => {
    if (isHydrated) {
      fetch("/api/telegram/webhook")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data && data.ok && data.bot) {
            setCoupledBot({
              username: data.bot.username,
              first_name: data.bot.first_name,
            });
          }
        })
        .catch((err) => {
          // Change console.error to safe console.warn to keep the applet active even under dev environment networking resets
          console.warn("Telegram bot non-critical initial register:", err.message || err);
        });
    }
  }, [isHydrated]);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Bidirectional sync between current visitor's standalone balances and sandbox users list
  useEffect(() => {
    if (!isHydrated) return;
    setUsers((prevUsers) => {
      const currentIdx = prevUsers.findIndex((u) => u.id === "user_current");
      if (currentIdx !== -1) {
        const currentUser = prevUsers[currentIdx];
        const targetEmail = telegramUser ? `@${telegramUser.username}` : currentUser.email;
        if (
          currentUser.tonBalance !== tonBalance ||
          currentUser.usdtBalance !== usdtBalance ||
          currentUser.email !== targetEmail
        ) {
          const updated = [...prevUsers];
          updated[currentIdx] = {
            ...currentUser,
            tonBalance,
            usdtBalance,
            email: targetEmail,
          };
          return updated;
        }
      }
      return prevUsers;
    });
  }, [tonBalance, usdtBalance, telegramUser, isHydrated]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (isHydrated && telegramUser && typeof window !== "undefined") {
      localStorage.setItem("ton_telegram_user_v5", JSON.stringify(telegramUser));
    }
  }, [telegramUser, isHydrated]);



  // Sync state items back to localStorage after hydration is complete
  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem("ton_tda_channels_v5", JSON.stringify(channels));
    }
  }, [channels, isHydrated]);

  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem("tda_applications_v5", JSON.stringify(tdaRequests));
    }
  }, [tdaRequests, isHydrated]);

  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem("ton_investor_apps_v5", JSON.stringify(investorApplications));
    }
  }, [investorApplications, isHydrated]);

  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem("ton_balance_v5", tonBalance.toString());
    }
  }, [tonBalance, isHydrated]);

  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem("usdt_balance_v5", usdtBalance.toString());
    }
  }, [usdtBalance, isHydrated]);

  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem("ton_holdings_v5", JSON.stringify(holdings));
    }
  }, [holdings, isHydrated]);

  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem("ton_activity_v5", JSON.stringify(activity));
    }
  }, [activity, isHydrated]);

  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem("ton_admin_role_v5", adminRole);
    }
  }, [adminRole, isHydrated]);

  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem("ton_system_settings_v5", JSON.stringify(systemSettings));
    }
  }, [systemSettings, isHydrated]);

  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem("ton_system_users_v5", JSON.stringify(users));
    }
  }, [users, isHydrated]);

  useEffect(() => {
    if (isHydrated && typeof window !== "undefined") {
      localStorage.setItem("ton_news_list_v5", JSON.stringify(newsList));
    }
  }, [newsList, isHydrated]);

  // Update currentTime
  useEffect(() => {
    if (!isHydrated) return;
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isHydrated]);

  // Check for ended TWAs
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let channelsToUpdate = false;
    let newChannels = [...channels];
    let newApps = [...investorApplications];
    let appsToRemove = new Set<string>();
    let refundAmount = 0;
    
    // We'll collect new holdings to add
    const newHoldingsToAdd: typeof holdings = [];
    const newActivityLogs: ActivityLog[] = [];

    for (let i = 0; i < newChannels.length; i++) {
        let ch = newChannels[i];
        
        // Check if there are active applications for this channel
        const hasPendingApps = newApps.some(a => a.channelId === ch.id);

        // Note: we consider progress=-1 as cancelled, no tdaEndTime as completed.
        const isTda = !!ch.tdaEndTime;
        const isTdaActive = isTda && ch.tdaProgress >= 0;
        const isCancelled = ch.tdaProgress < 0 && hasPendingApps;
        const timerEnded = isTdaActive && ch.tdaEndTime && currentTime >= ch.tdaEndTime;
        
        if ((timerEnded || isCancelled) && hasPendingApps) {
            channelsToUpdate = true;
            if (!isCancelled && ch.tdaProgress >= 70) {
                // Success!
                let allocationRate = Math.min(1, 100 / ch.tdaProgress);
                if (!isFinite(allocationRate) || isNaN(allocationRate)) allocationRate = 1;

                let priceBoost = 1;
                let oldPrice = ch.sharePrice;
                
                if (ch.tdaProgress > 100) {
                    // Price grows +11-29%
                    let boostPercent = 0.11 + Math.random() * (0.29 - 0.11);
                    priceBoost = 1 + boostPercent;
                    ch.sharePrice = parseFloat((ch.sharePrice * priceBoost).toFixed(4));
                    ch.priceChange24h = parseFloat((boostPercent * 100).toFixed(2));
                }

                newChannels[i] = { ...ch, tdaProgress: 100, tdaEndTime: undefined };
                
                // Grant shares
                newApps.forEach(app => {
                  if (app.channelId === ch.id) {
                    const allocatedShares = parseFloat((app.requestedShares * allocationRate).toFixed(4));
                    const assignedCost = parseFloat((allocatedShares * oldPrice).toFixed(2));
                    const appRefund = parseFloat((app.reservedTon - assignedCost).toFixed(2));
                    
                    if (appRefund > 0) refundAmount += appRefund;

                    newHoldingsToAdd.push({
                      channelId: ch.id,
                      sharesOwned: allocatedShares,
                      avgBuyPrice: oldPrice,
                      rewardsEarned: 0
                    });
                    appsToRemove.add(app.id);
                    newActivityLogs.push({
                      id: `act_grant_${Date.now()}_${app.id}`,
                      type: "TDA_LAUNCH",
                      channelName: ch.channelName,
                      details: `TDA Success! Allocated ${allocatedShares} shares (${(allocationRate*100).toFixed(0)}%). Refunded ${appRefund > 0 ? appRefund : 0} USDT.`,
                      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
                      amountTON: appRefund
                    });
                  }
                });
            } else {
                // Failed/Cancelled! Refund investors.
                newApps.forEach(app => {
                  if (app.channelId === ch.id) {
                    refundAmount += app.reservedTon;
                    appsToRemove.add(app.id);
                    newActivityLogs.push({
                      id: `act_refund_${Date.now()}_${app.id}`,
                      type: "SELL",
                      channelName: ch.channelName,
                      details: isCancelled ? `TDA Cancelled by Admin. Refunded ${app.reservedTon} USDT.` : `TDA Failed (< 70% reached). Refunded ${app.reservedTon} USDT.`,
                      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
                      amountTON: app.reservedTon
                    });
                  }
                });
                newChannels[i] = { ...ch, tdaProgress: -1 };
            }
        }
    }

    if (channelsToUpdate) {
        setChannels(newChannels);
        if (appsToRemove.size > 0) {
            setInvestorApplications(prev => prev.filter(a => !appsToRemove.has(a.id)));
        }
        if (refundAmount > 0) {
            setTonBalance(prev => parseFloat((prev + refundAmount).toFixed(2)));
        }
        if (newHoldingsToAdd.length > 0) {
            setHoldings(prev => {
                const updated = [...prev];
                newHoldingsToAdd.forEach(h => {
                    const existing = updated.find(x => x.channelId === h.channelId);
                    if (existing) {
                        existing.sharesOwned += h.sharesOwned;
                    } else {
                        updated.push(h);
                    }
                });
                return updated;
            });
        }
        if (newActivityLogs.length > 0) {
            setActivity(prev => [...newActivityLogs, ...prev]);
        }
    }
  }, [currentTime, channels, investorApplications]);
  /* eslint-enable react-hooks/set-state-in-effect */



  const [stagedChannel, setStagedChannel] = useState<ChannelTDA | null>(null); // Active Channel Market Page

  // Wallet State
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [walletAction, setWalletAction] = useState<"deposit" | "withdraw" | null>(null);
  const [walletAmount, setWalletAmount] = useState<string>("");
  const [walletActionError, setWalletActionError] = useState<string | null>(null);
  const [walletActionSuccess, setWalletActionSuccess] = useState<string | null>(null);



  // Notifications drawer / state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([
    {
      en: "Dividend distributed: Durov's Intel released $0.15/share revenue stream.",
      ru: "Выплачены дивиденды: Durov's Intel распределил $0.15 на акцию."
    },
    {
      en: "TDA Milestone: USDT Media 10 has hit 88% token allocation targets.",
      ru: "Важный этап TDA: USDT Media 10 достиг 88% от целевого распределения токенов."
    },
    {
      en: "Bonding Curve Alert: Meme Hub price stabilized at floor support levels.",
      ru: "Оповещение кривой AMM: Цена Meme Hub стабилизировалась на уровнях поддержки."
    }
  ]);

  // Trading Input State
  const [tradeAmount, setTradeAmount] = useState<string>("50");
  const [isBuying, setIsBuying] = useState<boolean>(true); // True = BUY, False = SELL
  const [tradeSuccessMsg, setTradeSuccessMsg] = useState<string | null>(null);



  // User Referral / Socials copy link
  const [copiedReferral, setCopiedReferral] = useState(false);

  // TDA Setup Wizard Flow Steps
  // 1: Verify, 2: Gemini Report Review, 3: Adjust parameters, 4: Acton Contracts Deploy, 5: Live!
  const [tdaStep, setTdaStep] = useState<number>(1);
  const [verifyHandle, setVerifyHandle] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [apiResult, setApiResult] = useState<any>(null); // Stores Gemini analysis results
  
  // Adjustable TDA Params
  const [customSharesSupply, setCustomSharesSupply] = useState<number>(100000);
  const [customFounderShare, setCustomFounderShare] = useState<number>(60);
  const [customFloatShare, setCustomFloatShare] = useState<number>(30);
  const [customVestingMonths, setCustomVestingMonths] = useState<number>(12);

  // Acton Smart Contract code visualization mode
  const [selectedContractCode, setSelectedContractCode] = useState<"issuance" | "staking" | "trading">("issuance");

  // News Creation Form states
  const [newNewsTagEn, setNewNewsTagEn] = useState<string>("UPGRADE • MAINNET");
  const [newNewsTagRu, setNewNewsTagRu] = useState<string>("ОБНОВЛЕНИЕ • СЕТЬ");
  const [newNewsTitleEn, setNewNewsTitleEn] = useState<string>("");
  const [newNewsTitleRu, setNewNewsTitleRu] = useState<string>("");
  const [newNewsDescEn, setNewNewsDescEn] = useState<string>("");
  const [newNewsDescRu, setNewNewsDescRu] = useState<string>("");
  const [newNewsDateEn, setNewNewsDateEn] = useState<string>("JUST NOW");
  const [newNewsDateRu, setNewNewsDateRu] = useState<string>("ТОЛЬКО ЧТО");
  const [newNewsBgStyle, setNewNewsBgStyle] = useState<string>("blue"); // 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose'
  const [newNewsCoverUrl, setNewNewsCoverUrl] = useState<string>("");
  const [isNewsCoverFileLoading, setIsNewsCoverFileLoading] = useState<boolean>(false);

  // Autoplay news interval effect (optimized with pause on hover, manual settings & interaction reset)
  useEffect(() => {
    const activeNewsLength = newsList.length;
    if (!isNewsAutoplay || isHoveringNews || activeNewsLength <= 1) return;
    const timer = setInterval(() => {
      setSlideDirection(1);
      setCurrentNewsIndex((prev) => (prev + 1) % activeNewsLength);
    }, 5000);
    return () => clearInterval(timer);
  }, [isNewsAutoplay, isHoveringNews, newsList.length, lastManualInteract]);

  // Local state for profile sub-views and active channel management
  const [profileViewMode, setProfileViewMode] = useState<"channels" | "tda">("channels");
  const [showTdaWizard, setShowTdaWizard] = useState<boolean>(false);

  // Filter Categories
  const categories = ["All", "USDT Ecosystem", "VC & Startups", "Entertainment", "Tech & Dev"];

  // Connect Wallet
  const handleConnectWallet = async () => {
    if (walletConnected) {
      await tonConnectUI.disconnect();
    } else {
      tonConnectUI.openModal();
    }
  };

  const handleCancelTda = (applicationId: string) => {
    const app = investorApplications.find(a => a.id === applicationId);
    if (!app) return;
    
    // Refund
    setTonBalance(prev => parseFloat((prev + app.reservedTon).toFixed(2)));
    setInvestorApplications(prev => prev.filter(a => a.id !== applicationId));

    // Revert TDA Progress
    setChannels((prev) => prev.map(c => {
      if (c.id === app.channelId) {
        const totalShares = c.totalShares || 100000;
        const floatFraction = (c.floatPercent || 30) / 100;
        const totalFloatShares = totalShares * floatFraction;
        const currentSoldSoft = (totalFloatShares * (c.tdaProgress / 100)) - app.requestedShares;
        let newProgress = Math.min(100, Math.max(0, parseFloat(((currentSoldSoft / totalFloatShares) * 100).toFixed(2))));
        return { ...c, tdaProgress: newProgress };
      }
      return c;
    }));

    setActivity((prev) => [
      {
        id: `act_${Date.now()}`,
        type: "SELL",
        channelName: app.channelName,
        details: `Cancelled TWA Application. Refunded ${formatNumber(app.reservedTon)} USDT`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        amountTON: app.reservedTon,
      },
      ...prev,
    ]);

    setTradeSuccessMsg(language === "ru" ? "Заявка отменена, средства возвращены" : "Application cancelled, funds refunded");
    setTimeout(() => setTradeSuccessMsg(null), 3000);
  };

  const handleModifyTda = (applicationId: string, channel: ChannelTDA, difference: number) => {
    const app = investorApplications.find((a) => a.id === applicationId);
    if (!app) return;

    const currentTimeMs = Date.now();
    const lastModified = app.lastModifiedAt || 0;
    const timeSinceLastModification = currentTimeMs - lastModified;
    const twoHoursInMs = 2 * 60 * 60 * 1000;

    if (timeSinceLastModification < twoHoursInMs) {
      const remainingTime = Math.ceil((twoHoursInMs - timeSinceLastModification) / (60 * 1000));
      alert(language === "ru" 
        ? `Вы можете изменить заявку только раз в 2 часа. Осталось: ${remainingTime} минут(ы).`
        : `You can only modify your application once every 2 hours. Remaining: ${remainingTime} minutes.`);
      return;
    }

    const newAmount = app.requestedShares + difference;
    if (newAmount <= 0) {
      handleCancelTda(applicationId);
      return;
    }

    if (difference > 0) {
      const totalShares = channel.totalShares || 100000;
      const floatFraction = (channel.floatPercent || 30) / 100;
      const totalFloatShares = totalShares * floatFraction;
      const currentSoldSoft = (totalFloatShares * (channel.tdaProgress / 100));
      const remainingFloatShares = totalFloatShares - currentSoldSoft;

      if (difference > remainingFloatShares) {
        alert(language === "ru" ? "Превышен лимит TWA!" : "Exceeds TDA limit!");
        return;
      }
    }

    const costDifference = difference * channel.sharePrice;
    
    if (costDifference > tonBalance) {
      alert(language === "ru" ? "Недостаточно USDT на балансе!" : "Insufficient USDT balance!");
      return;
    }

    setTonBalance((prev) => parseFloat((prev - costDifference).toFixed(2)));
    setInvestorApplications((prev) => prev.map((a) => 
      a.id === applicationId 
        ? { ...a, requestedShares: newAmount, reservedTon: parseFloat((a.reservedTon + costDifference).toFixed(2)), lastModifiedAt: currentTimeMs }
        : a
    ));

    // Update TDA Progress
    if (channel) {
      const totalShares = channel.totalShares || 100000;
      const floatFraction = (channel.floatPercent || 30) / 100;
      const totalFloatShares = totalShares * floatFraction;
      const currentSoldSoft = (totalFloatShares * (channel.tdaProgress / 100)) + difference;
      
      let newProgress = Math.max(0, parseFloat(((currentSoldSoft / totalFloatShares) * 100).toFixed(2)));
      setChannels((prev) => prev.map(c => c.id === channel.id ? { ...c, tdaProgress: newProgress } : c));
      if (stagedChannel && stagedChannel.id === channel.id) {
         setStagedChannel(prev => prev ? { ...prev, tdaProgress: newProgress } : null);
      }
    }

     
    const nowTime = Date.now();
    setActivity((prev) => [
      {
        id: `act_${nowTime}`,
        type: difference > 0 ? "BUY" : "SELL",
        channelName: app.channelName,
        details: `${difference > 0 ? "Increased" : "Decreased"} TDA Application by ${Math.abs(difference)} Shares`,
         
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        amountTON: Math.abs(costDifference),
      },
      ...prev,
    ]);
  };

  const handleApplyTda = (channel: ChannelTDA) => {
    const amountVal = parseFloat(parseFloat(tradeAmount).toFixed(4));
    if (isNaN(amountVal) || amountVal <= 0) {
      alert(language === "ru" ? "Пожалуйста, введите корректное количество акций." : "Please enter a valid amount of shares.");
      return;
    }

    const totalShares = channel.totalShares || 100000;
    const floatFraction = (channel.floatPercent || 30) / 100;
    const totalFloatShares = totalShares * floatFraction;
    const currentSoldSoft = totalFloatShares * (channel.tdaProgress / 100);

    const totalCost = parseFloat((amountVal * channel.sharePrice).toFixed(2));
    
    if (totalCost > tonBalance) {
      alert(language === "ru" ? "Недостаточно USDT на балансе!" : "Insufficient USDT balance!");
      return;
    }

    // Deduct
    setTonBalance((prev) => parseFloat((prev - totalCost).toFixed(2)));
    
     
    const nowTime = Date.now();
    const newApp = {
      id: `tda_app_${nowTime}`,
      channelId: channel.id,
      channelName: channel.channelName,
      requestedShares: amountVal,
      reservedTon: totalCost,
      status: "Pending Allocation",
      lastModifiedAt: nowTime
    };

    setInvestorApplications(prev => [newApp, ...prev]);

    const newSoldSoft = currentSoldSoft + amountVal;
    let newProgress = parseFloat(((newSoldSoft / totalFloatShares) * 100).toFixed(2));

    setChannels(prev => prev.map(c => 
      c.id === channel.id ? { ...c, tdaProgress: newProgress } : c
    ));
    
    if (stagedChannel && stagedChannel.id === channel.id) {
       setStagedChannel(prev => prev ? { ...prev, tdaProgress: newProgress } : null);
    }

    setActivity((prev) => [
      {
        id: `act_${nowTime}`,
        type: "BUY",
        channelName: channel.channelName,
        details: `Applied for ${amountVal} TWA Shares at ${channel.sharePrice} USDT`,
         
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        amountTON: totalCost,
      },
      ...prev,
    ]);

    setTradeAmount("");
    setTradeSuccessMsg(language === "ru" ? "Заявка на TWA успешно принята" : "TDA Application submitted successfully");
    setTimeout(() => setTradeSuccessMsg(null), 3000);
  };

  // Execute buy or sell order
  const handleTrade = (channel: ChannelTDA) => {
    // Check ban status of visitor
    const currentVisitorRecord = users.find((u) => u.id === "user_current");
    if (currentVisitorRecord && currentVisitorRecord.status === "banned") {
      alert(language === "ru" 
        ? `Действие запрещено. Ваш аккаунт заблокирован по соображениям безопасности: ${currentVisitorRecord.suspensionReason || "Нарушение регламента"}`
        : `Deactivated. Your account has been suspended by regulatory compliance: ${currentVisitorRecord.suspensionReason || "Policy violation"}`);
      return;
    }

    // Check system trading toggle
    if (systemSettings.tradingHalted) {
      alert(language === "ru" 
        ? "Торги приостановлены регулятором системы во всем приложении." 
        : "Trading is halted globally by decision of general risk moderators.");
      return;
    }

    const amountVal = parseFloat(parseFloat(tradeAmount).toFixed(4));
    if (isNaN(amountVal) || amountVal <= 0) {
      alert(language === "ru" ? "Пожалуйста, введите корректное количество акций." : "Please enter a valid amount of shares.");
      return;
    }

    const totalCost = amountVal * channel.sharePrice;

    // Check single trade limit
    if (totalCost > systemSettings.maxSingleTradeTon) {
      alert(language === "ru" 
        ? `Лимит сделки превышен! Максимальный размер одной сделки составляет ${systemSettings.maxSingleTradeTon} USDT.` 
        : `Trade size limit exceeded! Maximum single transaction limit is set to ${systemSettings.maxSingleTradeTon} USDT.`);
      return;
    }

    const isBuyMode = channel.tdaProgress < 100 || isBuying;

    if (isBuyMode) {
      if (totalCost < 0.01) {
        alert(language === "ru" 
          ? "Минимальная стоимость покупки составляет 0.01 USDT. Пожалуйста, укажите больше акций." 
          : "Minimum transaction cost is 0.01 USDT. Please trade a higher amount of shares.");
        return;
      }
      if (tonBalance < totalCost) {
        alert(language === "ru" ? "Недостаточно USDT на балансе для этой сделки." : "Insufficient USDT balance for this transaction.");
        return;
      }

      // Calculate stable total shares and float limit
      const totalShares = channel.totalShares || 100000;
      const floatFraction = (channel.floatPercent || 30) / 100;
      const totalFloatShares = totalShares * floatFraction;

      // Check if channel is in TDA stage (has an active timer)
      const isTDAStage = !!channel.tdaEndTime;
      let newProgress = channel.tdaProgress;
      let tdaCompletedAlert = false;

      // Determine remaining buyable shares based on stage
      const userHolding = holdings.find((h) => h.channelId === channel.id);
      const userSharesOwned = userHolding?.sharesOwned || 0;

      let remainingFloatShares = 0;
      if (isTDAStage) {
        // In TDA subscription stage, remaining shares are the unassigned float shares
        const currentSoldSoft = totalFloatShares * (channel.tdaProgress / 100);
        remainingFloatShares = Math.max(0, totalFloatShares - currentSoldSoft);
      } else {
        // In Secondary Trading, user can only buy up to the total public float amount
        remainingFloatShares = Math.max(0, totalFloatShares - userSharesOwned);
      }

      // Check if requested buy amount exceeds remaining allocation
      if (amountVal > remainingFloatShares) {
        const detailMsgEn = isTDAStage
          ? `Selected amount exceeds the remaining TDA subscription limit of ${formatNumber(Math.floor(remainingFloatShares))} shares.`
          : `Selected amount exceeds the remaining available float limit of ${formatNumber(Math.floor(remainingFloatShares))} shares.`;
        const detailMsgRu = isTDAStage
          ? `Выбранное количество превышает оставшийся лимит подписки TDA в размере ${formatNumber(Math.floor(remainingFloatShares))} акций.`
          : `Выбранное количество превышает оставшийся лимит свободного обращения в размере ${formatNumber(Math.floor(remainingFloatShares))} акций.`;
        alert(language === "ru" ? detailMsgRu : detailMsgEn);
        return;
      }

      // Calculate new progress for TDA stage based on stable totalFloatShares
      if (isTDAStage) {
        const currentSoldSoft = totalFloatShares * (channel.tdaProgress / 100);
        const newSoldSoft = currentSoldSoft + amountVal;
        newProgress = parseFloat(((newSoldSoft / totalFloatShares) * 100).toFixed(2));
      }

      // Deduct balance
      setTonBalance((prev) => parseFloat((prev - totalCost).toFixed(2)));

      // Add/Update Holdings
      setHoldings((prev) => {
        const existing = prev.find((h) => h.channelId === channel.id);
        if (existing) {
          const totalSharesOwned = existing.sharesOwned + amountVal;
          const newAvgPrice = ((existing.sharesOwned * existing.avgBuyPrice) + totalCost) / totalSharesOwned;
          return prev.map((h) =>
            h.channelId === channel.id
              ? { ...h, sharesOwned: totalSharesOwned, avgBuyPrice: parseFloat(newAvgPrice.toFixed(4)) }
              : h
          );
        } else {
          return [
            ...prev,
            { channelId: channel.id, sharesOwned: amountVal, avgBuyPrice: channel.sharePrice, rewardsEarned: 0 }
          ];
        }
      });

      // Keep prices fixed since user requested fixed prices and amounts.
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channel.id
            ? {
                ...c,
                tdaProgress: newProgress
              }
            : c
        )
      );

      // Add Activity Log
      const activityDetails = isTDAStage
        ? `Subscribed to ${amountVal} TWA shares at ${channel.sharePrice} USDT. ${Math.round(newProgress)}% subscribed.`
        : `Acquired ${amountVal} shares at ${channel.sharePrice} USDT`;

       
      const actId = "act_" + Date.now();
      const newActivity: ActivityLog = {
        id: actId,
        type: "BUY",
        channelName: channel.channelName,
        details: activityDetails,
         
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
        amountTON: parseFloat(totalCost.toFixed(2))
      };
      setActivity((prev) => [newActivity, ...prev]);

      if (tdaCompletedAlert) {
        const completeActivity: ActivityLog = {
           
          id: "act_comp_" + Date.now(),
          type: "TDA_LAUNCH",
          channelName: channel.channelName,
          details: `TDA Fully Subscribed! Smart contracts transition ${channel.channelName} into Secondary Trading on USDT with active liquidity.`,
           
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
          amountTON: 0
        };
        setActivity((prev) => [completeActivity, ...prev]);
        
        // Add dynamic notification about completed TDA
        const notifyEn = `TDA for "${channel.channelName}" has successfully completed! Trading is now live.`;
        const notifyRu = `TDA для "${channel.channelName}" было завершено! Открыты торги на вторичном рынке.`;
        setNotifications((prev) => [
          { en: notifyEn, ru: notifyRu },
          ...prev
        ]);
      }

      // Highlight active view price if selected
      if (stagedChannel && stagedChannel.id === channel.id) {
        setStagedChannel((prev) => prev ? {
          ...prev,
          tdaProgress: newProgress
        } : null);
      }

      setTradeSuccessMsg(
        isTDAStage 
          ? `Successfully subscribed to ${amountVal} shares!` 
          : `Successfully purchased ${amountVal} shares!`
      );
      setTimeout(() => setTradeSuccessMsg(null), 3500);
    } else {
      // Selling
      const userHolding = holdings.find((h) => h.channelId === channel.id);
      const readyToSell = (userHolding?.sharesOwned || 0);

      if (readyToSell < amountVal) {
        alert(language === "ru" 
          ? `У вас есть только ${readyToSell} доступных акций для продажи (за вычетом стейкинга).` 
          : `You only have ${readyToSell} unstaked shares available to sell.`);
        return;
      }

      const totalRevenue = amountVal * channel.sharePrice;

      if (totalRevenue < 0.01) {
        alert(language === "ru" 
          ? "Минимальная стоимость продажи составляет 0.01 USDT. Пожалуйста, укажите больше акций." 
          : "Minimum transaction sale revenue must be at least 0.01 USDT. Please trade a higher amount of shares.");
        return;
      }

      // Add to balance
      setTonBalance((prev) => parseFloat((prev + totalRevenue).toFixed(2)));

      // Deduct Holdings
      setHoldings((prev) => {
        return prev.map((h) => {
          if (h.channelId === channel.id) {
            return { ...h, sharesOwned: h.sharesOwned - amountVal };
          }
          return h;
        }).filter((h) => h.sharesOwned > 0 || h.rewardsEarned > 0);
      });

      // Simple bonding curve pricing: price depreciates slightly on sell
      const totalShares = channel.totalShares || 100000;
      
      // Kept prices fixed since user requested fixed quantities and prices.

      // Add Activity Log
       
      const txId = "act_" + Date.now();
      const newActivity: ActivityLog = {
        id: txId,
        type: "SELL",
        channelName: channel.channelName,
        details: `Liquidated ${amountVal} shares at ${channel.sharePrice} USDT`,
         
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
        amountTON: parseFloat(totalRevenue.toFixed(2))
      };
      setActivity((prev) => [newActivity, ...prev]);

      // Highlight active view price if selected
      if (stagedChannel && stagedChannel.id === channel.id) {
        setStagedChannel((prev) => prev ? {
          ...prev
        } : null);
      }

      setTradeSuccessMsg(`Successfully sold ${amountVal} shares!`);
      setTimeout(() => setTradeSuccessMsg(null), 3500);
    }
  };



  // Invoke Gemini AI to evaluate a Telegram channel for TDA setup
  const handleQueryGemini = async () => {
    const currentVisitorRecord = users.find((u) => u.id === "user_current");
    if (currentVisitorRecord && currentVisitorRecord.status === "banned") {
      alert(language === "ru" 
        ? `Действие запрещено. Ваш аккаунт заблокирован по соображениям безопасности: ${currentVisitorRecord.suspensionReason || "Нарушение регламента"}`
        : `Deactivated. Your account has been suspended by regulatory compliance: ${currentVisitorRecord.suspensionReason || "Policy violation"}`);
      return;
    }

    if (!verifyHandle) {
      alert("Please provide a valid Telegram channel @username");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelHandle: verifyHandle }),
      });

      const parsed = await response.json();
      setApiResult(parsed);
      setTdaStep(2); // Progress to report screen
    } catch (e) {
      console.error(e);
      alert("Verification issue. Initializing premium automated fallback.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Compile and Launch full customized TDA to Market Boards
  const deployCustomTDA = () => {
    const currentVisitorRecord = users.find((u) => u.id === "user_current");
    if (currentVisitorRecord && currentVisitorRecord.status === "banned") {
      alert(language === "ru" 
        ? `Действие запрещено. Ваш аккаунт заблокирован по соображениям безопасности: ${currentVisitorRecord.suspensionReason || "Нарушение регламента"}`
        : `Deactivated. Your account has been suspended by regulatory compliance: ${currentVisitorRecord.suspensionReason || "Policy violation"}`);
      return;
    }

    if (!apiResult) return;

    const newChannelID = "custom_" + apiResult.handle.toLowerCase().replace(/[^a-z0-9]/g, "");

    const newTDA: ChannelTDA = {
      id: newChannelID,
      handle: apiResult.handle,
      channelName: apiResult.channelName,
      category: apiResult.category || "General Media",
      subscribers: apiResult.subscriberCount >= 1000000 
        ? `${(apiResult.subscriberCount / 1000000).toFixed(1)}M` 
        : `${(apiResult.subscriberCount / 1000).toFixed(0)}K`,
      subscriberCount: apiResult.subscriberCount,
      monthlyRevenue: apiResult.monthlyRevenue_USD, // 1:1 with USDT
      valuation: apiResult.suggestedValuation_USD,
      tdaProgress: 0,
      countdownHours: 120,
      tdaEndTime: Date.now() + (120 * 3600000), // Real ending timestamp
      sharePrice: parseFloat((apiResult.suggestedValuation_USD / customSharesSupply).toFixed(4)),
      priceChange24h: 0.0,
      floatPercent: customFloatShare,
      founderOwnershipPercent: customFounderShare,
      holdersCount: 1, // Only founder initially
      yieldPercent: apiResult.yieldPercent || 8.1,
      isCustomTDA: true,
      totalShares: customSharesSupply,
      avatarUrl: uploadedFileBase64 || ""
    };

    // Append newly deployed equity token
    setChannels((prev) => [newTDA, ...prev]);

    // Create custom portfolio item as founder
    setHoldings((prev) => [
      ...prev,
      {
        channelId: newTDA.id,
        sharesOwned: Math.floor(customSharesSupply * (customFounderShare / 100)),
        avgBuyPrice: newTDA.sharePrice,
        rewardsEarned: 0
      }
    ]);

    // Track launch event
    const launchAct: ActivityLog = {
      id: "act_" + Date.now(),
      type: "TDA_LAUNCH",
      channelName: newTDA.channelName,
      details: `TWA Deployed on Acton smart contracts. Issued ${formatNumber(customSharesSupply)} shares with ${customFounderShare}% founder vesting allocation.`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
      amountTON: 0
    };
    setActivity((prev) => [launchAct, ...prev]);

    setTdaStep(5); // Completion step
  };

  // File Upload base64 translation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(t("File is too large! Maximum limit is 5MB.", "Файл слишком большой! Максимальный лимит — 5МБ."));
        return;
      }
      setUploadedFileName(file.name);
      setUploadedFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      setFileIsPdf(file.type === "application/pdf" || file.name.endsWith(".pdf"));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit dynamic TDA verification request
  const handleSubmitTDARequest = (e: React.FormEvent) => {
    e.preventDefault();

    const currentVisitorRecord = users.find((u) => u.id === "user_current");
    if (currentVisitorRecord && currentVisitorRecord.status === "banned") {
      alert(language === "ru" 
        ? "Ваш счет заблокирован по соображениям безопасности. Создание заявок приостановлено." 
        : "Your account has been suspended. Listing submissions are paused.");
      return;
    }

    if (systemSettings.tdaSubmissionLimit) {
      alert(language === "ru" 
        ? "Регуляторные ограничения: Прием новых заявок на TDA временно приостановлен." 
        : "Regulatory limits: Submitting new TDA applications is temporarily halted.");
      return;
    }

    if (!submitTdaName || !submitTdaHandle || !submitTdaSubscribers || !submitTdaRevenue || !submitTdaViews) {
      alert(t("Please fill out all required fields!", "Пожалуйста, заполните все обязательные поля!"));
      return;
    }

    setAppSubmissionStatus("submitting");

    setTimeout(() => {
      const newRequest = {
        id: "req_" + Date.now(),
        channelName: submitTdaName,
        channelHandle: submitTdaHandle.startsWith("@") ? submitTdaHandle : "@" + submitTdaHandle,
        subscribers: parseInt(submitTdaSubscribers) || 0,
        monthlyViews: parseInt(submitTdaViews) || 0,
        monthlyRevenue: parseFloat(submitTdaRevenue) || 0,
        channelAge: parseFloat(submitTdaAge) || 2,
        proofFileName: uploadedFileName || t("No proofs attached", "Доказательства не прикреплены"),
        proofFileSize: uploadedFileSize || "",
        proofFileBase64: uploadedFileBase64 || "",
        additionalStats: submitTdaStats,
        stage: "Verification", // Verification = На рассмотрении/модерации
        date: t("Under Review", "На модерации"),
        progress: "15%",
        submissionDate: new Date().toISOString().substring(0, 10)
      };

      setTdaRequests((prev) => [newRequest, ...prev]);

      // Add helper notification
      const notifyEn = `TDA Application for "${submitTdaName}" submitted to Chief Admin.`;
      const notifyRu = `Заявка на TDA для "${submitTdaName}" успешно отправлена главному администратору.`;
      setNotifications((prev) => [
        { en: notifyEn, ru: notifyRu },
        ...prev
      ]);

      setAppSubmissionStatus("success");
      
      // Clear forms
      setSubmitTdaName("");
      setSubmitTdaHandle("");
      setSubmitTdaSubscribers("");
      setSubmitTdaViews("");
      setSubmitTdaRevenue("");
      setSubmitTdaAge("2");
      setSubmitTdaStats("");
      setUploadedFileName("");
      setUploadedFileSize("");
      setUploadedFileBase64("");
      setFileIsPdf(false);
    }, 1200);
  };

  // Admin Approve Action (Integrates and deploys the TDA in dynamic channels state immediately!)
  const handleAdminApproveRequest = (requestId: string, customSharesSupplyVal: number, customSharePriceVal: number, customDurationHours: number) => {
    const req = tdaRequests.find((r) => r.id === requestId);
    if (!req) return;

    // Evaluate date strings & id beforehand to ensure React state updaters remain pure functions
     
    const nowTimestamp = Date.now();
    const approvedDateStr = new Date(nowTimestamp + (customDurationHours / 24) * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const activityId = "act_admin_approved_" + nowTimestamp;
    const activityTimestamp = new Date(nowTimestamp).toISOString().replace("T", " ").substring(0, 16);

    // Calculate and formulate corresponding ChannelTDA object
    // Valuation logic: e.g. 0.15 USDT per subscriber + weight of monthly ad revenues
    const subscriberCount = req.subscribers;
    const baseValuation = customSharesSupplyVal * customSharePriceVal;
    const sharePriceVal = customSharePriceVal;

    const newChannelID = "approved_" + req.channelHandle.replace("@", "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const newTDA: ChannelTDA = {
      id: newChannelID,
      handle: req.channelHandle,
      channelName: req.channelName,
      category: "USDT Ecosystem",
      subscribers: subscriberCount >= 1000000 
        ? `${(subscriberCount / 1000000).toFixed(1)}M` 
        : `${(subscriberCount / 1000).toFixed(0)}K`,
      subscriberCount: subscriberCount,
      monthlyRevenue: req.monthlyRevenue,
      valuation: Math.round(baseValuation),
      tdaProgress: 0,
      countdownHours: customDurationHours, // Custom admin-defined duration
       
      tdaEndTime: Date.now() + (customDurationHours * 3600000), // Real ending timestamp
      sharePrice: sharePriceVal,
      priceChange24h: 0.0,
      floatPercent: 30,
      founderOwnershipPercent: 70,
      holdersCount: 1,
      yieldPercent: parseFloat(((req.monthlyRevenue * 12) / baseValuation * 100).toFixed(1)) || 11.5,
      isCustomTDA: true,
      totalShares: customSharesSupplyVal
    };

    // Append to live platform trading listings
    setChannels((prev) => {
      // Avoid duplicate keys
      if (prev.some((c) => c.id === newChannelID)) {
        return prev;
      }
      return [newTDA, ...prev];
    });

    // Update the request stage to approved
    setTdaRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              stage: "Scheduled",
              progress: "100%",
              date: approvedDateStr
            }
          : r
      )
    );

    // Track active launch event inside general ledger
    const actionAct: ActivityLog = {
      id: activityId,
      type: "TDA_LAUNCH",
      channelName: req.channelName,
      details: `TDA Deployed on Acton smart contracts. Issued ${formatNumber(customSharesSupplyVal)} shares with initial price ${customSharePriceVal} USDT.`,
      timestamp: activityTimestamp,
      amountTON: 0
    };
    setActivity((prev) => [actionAct, ...prev]);

    // Send notifications
    const notifyEn = `TDA Application for "${req.channelName}" APPROVED & DEPLOYED on-chain via Acton compiler.`;
    const notifyRu = `Заявка на TDA для "${req.channelName}" ОДОБРЕНА И ЗАПУЩЕНА в блокчейне. Смарт-контракт на ${formatNumber(customSharesSupplyVal)} акций выпущен на Acton.`;
    setNotifications((prev) => [
      { en: notifyEn, ru: notifyRu },
      ...prev
    ]);
  };

  // Helper generator to construct Acton interactive compiling views for the chief moderator
  const getAdminActonContractAsset = (name: string, handle: string, supply: number, price: number, tab: "code" | "abi" | "config") => {
    const capsHandle = handle.replace("@", "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const className = (capsHandle || "CHANNEL") + "_TDA_Contract";

    if (tab === "code") {
      return `// Acton Smart Contract: ${capsHandle || "CHANNEL"}_TDA.act
// Real USDT digital asset compiled and deployed via Acton CLI

import usdt.contract.standard;
import usdt.contract.equity_manager;

contract ${className} {
    // TDA parameters injected from Chief Moderator configuration
    let totalShares: Int64 = ${supply};
    let initialPriceMicroUSDT: Int64 = ${Math.round(price * 1000000)}; // ${price} USDT per share
    let tickerName: String = "${(capsHandle || "CHNL").substring(0, 4)}";
    let telegramHandle: String = "${handle}";
    let entityName: String = "${name}";

    // Acton dynamic allocations
    let ownerAddress: Address = sender();
    let treasuryAllocated: Int64 = 0;
    let indexMap: map(Address => Int64);

    public init() {
        // 70% vesting to creator, 30% floating public offering
        let companyReserve: Int64 = (this.totalShares * 70) / 100;
        let publicLiquidity: Int64 = this.totalShares - companyReserve;

        this.indexMap[this.ownerAddress] = companyReserve;
        this.indexMap[@usdt_address("EQ_ACTON_TREASURY_BUFFER_0912")] = publicLiquidity;

        emit DeployedOnActon({
            contract_id: myAddress(),
            shares_issued: this.totalShares,
            listing_price: this.initialPriceMicroUSDT,
            symbol: this.tickerName
        });
    }

    // Smart contract core trading logic
    public receive(msg: BuySharesOrder) {
        let orderValue: Int64 = context.value;
        let calculatedShares: Int64 = orderValue / this.initialPriceMicroUSDT;
        
        require(this.indexMap[@usdt_address("EQ_ACTON_TREASURY_BUFFER_0912")] >= calculatedShares, "Not enough liquid shares in public pool");
        
        this.indexMap[@usdt_address("EQ_ACTON_TREASURY_BUFFER_0912")] -= calculatedShares;
        this.indexMap[sender()] += calculatedShares;
        
        emit SharesTransferred({
            recipient: sender(),
            amount: calculatedShares,
            paid_usdt: orderValue
        });
    }
}`;
    } else if (tab === "abi") {
      return `{
  "compiler": "Acton Toolchain v1.4.2",
  "contractName": "${className}",
  "interface": [
    { "name": "init", "inputs": [], "outputs": [] },
    { "name": "receive", "inputs": [{ "name": "msg", "type": "BuySharesOrder" }], "outputs": [] },
    { "name": "get_balance", "inputs": [{ "name": "address", "type": "Address" }], "outputs": [{ "type": "Int64" }] },
    { "name": "get_tda_details", "inputs": [], "outputs": [{ "type": "Tuple" }] }
  ],
  "storage": {
    "totalShares": "Int64",
    "initialPriceMicroUSDT": "Int64",
    "tickerName": "String",
    "telegramHandle": "String",
    "ownerAddress": "Address",
    "indexMap": "map(Address => Int64)"
  }
}`;
    } else {
      return `{
  "project": "${className}_Deploy",
  "toolchain": "Acton Smart Compiler",
  "target": "usdt-mainnet-v2",
  "optimization": {
    "level": "O3",
    "inline_depth": 5,
    "bytecode_shorten": true
  },
  "deployment": {
    "gas_limit": 15000000,
    "fee_estimation_micro": 420,
    "initial_balance_usdt": 0.05
  }
}`;
    }
  };

  // Simulating Acton step-by-step pipeline compile and target deployment in on-chain ledger
  const startActonCompilation = (requestId: string) => {
    setIsCompilingActon(true);
    setActonCompilationStep(1);

    setTimeout(() => {
      setActonCompilationStep(2);
      setTimeout(() => {
        setActonCompilationStep(3);
        setTimeout(() => {
          setActonCompilationStep(4);
          setTimeout(() => {
            // Deploy the smart contract for real
            handleAdminApproveRequest(requestId, adminSharesSupply, adminSharePrice, adminDurationHours);
            setIsCompilingActon(false);
            setAdminDeployingReqId(null);
            setActonCompilationStep(0);
          }, 1400);
        }, 1200);
      }, 1000);
    }, 800);
  };
  const handleAdminRejectRequest = (requestId: string, reasonText: string) => {
    if (!reasonText.trim()) {
      alert(t("Please input a reason for rejection!", "Пожалуйста, введите причину отклонения!"));
      return;
    }

    setTdaRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              stage: "Rejected",
              progress: "0%",
              date: "N/A",
              rejectionReason: reasonText
            }
          : r
      )
    );

    const req = tdaRequests.find((r) => r.id === requestId);
    const notifyEn = `TDA Application for "${req?.channelName || 'channel'}" was rejected.`;
    const notifyRu = `Заявка на TDA для "${req?.channelName || 'канала'}" была отклонена. Причина: ${reasonText}`;
    setNotifications((prev) => [
      { en: notifyEn, ru: notifyRu },
      ...prev
    ]);

    alert(t("Application has been denied and feedback sent.", "Заявка отклонена, комментарий отправлен автору."));
  };

  // Filter and sort channels based on Search, Selected category, Market segment, and Sorting option
  const filteredChannels = channels
    .filter((c) => {
      const matchesSearch =
        c.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.handle.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesCategory = true;
      if (selectedCategory !== "All") {
        if (selectedCategory === "USDT Ecosystem") matchesCategory = c.category.includes("USDT") || c.category.includes("TON");
        else if (selectedCategory === "VC & Startups") matchesCategory = c.category.includes("Founder") || c.category.includes("Startup") || c.category.includes("VC");
        else if (selectedCategory === "Entertainment") matchesCategory = c.category.includes("Entertainment");
        else if (selectedCategory === "Tech & Dev") matchesCategory = c.category.includes("AI") || c.category.includes("Tech") || c.category.includes("Research");
        else matchesCategory = c.category.includes(selectedCategory);
      }

      let matchesSegment = true;
      if (marketSegment === "TDA") matchesSegment = c.tdaProgress >= 0 && c.tdaProgress < 100;
      else if (marketSegment === "Secondary") matchesSegment = c.tdaProgress === 100;

      return matchesSearch && matchesCategory && matchesSegment;
    })
    .sort((a, b) => {
      if (sortBy === "price") {
        return b.sharePrice - a.sharePrice;
      }
      if (sortBy === "change") {
        return b.priceChange24h - a.priceChange24h;
      }
      if (sortBy === "subs") {
        const aSubs = parseInt(a.subscribers.replace(/[^0-9]/g, "")) || 0;
        const bSubs = parseInt(b.subscribers.replace(/[^0-9]/g, "")) || 0;
        return bSubs - aSubs;
      }
      // default sortBy === "name"
      return a.channelName.localeCompare(b.channelName);
    });

  // Render Smart Contract Code blocks in Liquid aesthetics
  const renderContractCode = () => {
    switch (selectedContractCode) {
      case "issuance":
        return `// Acton Smart Contract: MediaEquityToken.act
contract MediaEquityToken {
    let ticker: String = "MINT";
    let treasury: Address;
    let founder: Address;
    let totalShares: Int;
    let outstandingShares: Int;
    let floatPercent: Int;

    init(supply: Int, float: Int, dev: Address) {
        self.totalShares = supply;
        self.founder = dev;
        self.outstandingShares = (supply * float) / 100;
        self.floatPercent = float;
        self.treasury = context.sender;
    }

    public fun issueTDA() {
        assert(context.sender == self.founder, "Unauthorized");
        sendToken({
            to: self.treasury,
            amount: self.outstandingShares,
            memo: "Public allocation issuance"
        });
    }
}`;
      case "staking":
        return `// Acton Smart Contract: StakingRewardsPool.act
contract StakingRewardsPool {
    let tokenAddress: Address;
    let stakers: Map<Address, Int>;
    let rewardPerShare: Int = 0;
    let exitTaxMultiplier: Int = 2; // 2% exit protection

    init(equity: Address) {
        self.tokenAddress = equity;
    }

    public fun stakeShares(amount: Int) {
        transferTokensFrom(context.sender, self, amount);
        let current = self.stakers.get(context.sender) ?? 0;
        self.stakers.set(context.sender, current + amount);
    }

    public fun payoutAdDividends() {
        let incomingStars = context.value;
        self.rewardPerShare += (incomingStars / self.totalStaked);
    }
}`;
      case "trading":
        return `// Acton Smart Contract: MediaBondingCurve.act
contract MediaBondingCurve {
    let basePrice: Int = 1 * 10^6; // 1 USDT min
    let reserveBalance: Int = 0;
    let slopeCoefficient: Int = 1420;

    public fun calculatePurchasePrice(amount: Int): Int {
        let supply = self.currentCirculating;
        // P = basePrice + slope * S
        return (self.basePrice * amount) + (self.slopeCoefficient * amount * supply);
    }

    public fun buyShares(amountToBuy: Int) {
        let cost = self.calculatePurchasePrice(amountToBuy);
        assert(context.value >= cost, "Insufficient funds submitted");
        transferShares(context.sender, amountToBuy);
        self.reserveBalance += cost;
    }
}`;
    }
  };

  return (
    <div id="min-app-root" className="min-h-screen bg-[#141414] text-white flex flex-col max-w-md mx-auto relative border-x border-white/[0.04] pb-32 selection:bg-neutral-800">
      
      {/* CORE DISPLAY CANVAS CONTAINER */}
      <main id="core-viewport" className="px-4 py-4 flex-1">
        
        {/* VIEW DETAILED CHANNEL MARKET PAGE IF ACTIVE */}
        {stagedChannel ? (
          <div id="channel-detailed-view" className="space-y-6 page-fade-enter">
            {/* Back header */}
            <button
              onClick={() => setStagedChannel(null)}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 w-fit"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{t("EXIT TERMINAL", "ВЫЙТИ ИЗ ТЕРМИНАЛА")}</span>
            </button>

            {/* Premium Header Banner */}
            <div className="relative rounded-3xl overflow-hidden min-h-[140px] border border-white/5 bg-[#121215] flex items-end p-4">
              <div className="absolute inset-0 bg-[#0c0c0e]/95 opacity-90" />

              <div className="relative z-20 flex items-center gap-3 w-full">
                {/* Channel Initial Symbol Circle */}
                <div className="w-16 h-16 rounded-2xl bg-[#18181C] border border-white/10 flex items-center justify-center font-bold text-2xl text-white font-mono">
                  {stagedChannel.channelName.substring(0, 1)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-xl font-display font-semibold tracking-tight">{stagedChannel.channelName}</h1>
                    <span className="px-1.5 py-0.5 bg-white/10 border border-white/10 text-white rounded text-[9px] font-mono tracking-widest font-bold">
                      {t("SEC VERIFIED", "ВЕРИФИЦИРОВАНО SEC")}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-neutral-400">@{stagedChannel.handle}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">{stagedChannel.category}</p>
                </div>
              </div>
            </div>

            {/* Real asset quote metrics grid (Robinhood themed) */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-mono text-neutral-500 block uppercase mb-1">{t("SHARE VALUE", "СТОИМОСТЬ АКЦИИ")}</span>
                <span className="text-lg font-mono font-bold text-white leading-none">{formatNumber(stagedChannel.sharePrice, 4)} USDT</span>
                <span className={`text-[10px] font-mono block font-bold mt-1 ${
                  stagedChannel.priceChange24h >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {stagedChannel.priceChange24h > 0 ? "+" : ""}{stagedChannel.priceChange24h}% (24h)
                </span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-mono text-neutral-500 block uppercase mb-1">{t("MARKET CAP", "КАПИТАЛИЗАЦИЯ")}</span>
                <span className="text-lg font-mono font-bold text-white leading-none">{formatNumber(stagedChannel.valuation)}<br/><span className="text-[10px] text-neutral-400">USDT</span></span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-mono text-neutral-500 block uppercase mb-1">{t("TOTAL SUPPLY", "ОБЩЕЕ КОЛ-ВО")}</span>
                <span className="text-lg font-mono font-bold text-white leading-none">{formatNumber(Math.floor(stagedChannel.valuation / stagedChannel.sharePrice), 0)}</span>
                <div className="mt-1.5 flex flex-col gap-0.5 text-[8px] font-mono tracking-tighter">
                   <div className="flex justify-between text-neutral-400">
                     <span>{t("Public:", "В торгах:")}</span>
                     <span className="text-sky-400">{stagedChannel.floatPercent}%</span>
                   </div>
                   <div className="flex justify-between text-neutral-400">
                     <span className="truncate pr-1">@{stagedChannel.founder || stagedChannel.handle}:</span>
                     <span className="text-amber-400 shrink-0">{stagedChannel.founderOwnershipPercent}%</span>
                   </div>
                </div>
              </div>
            </div>

            {/* TradingView Chart Frame (Hidden for TDAs) */}
            {!stagedChannel.tdaEndTime && (
              <div className="liquid-glass border border-white/5 p-4 rounded-3xl">
                <TradingChart
                  channelId={stagedChannel.id}
                  sharePrice={stagedChannel.sharePrice}
                  priceChange24h={stagedChannel.priceChange24h}
                />
              </div>
            )}

            {/* ACTION MODULE: Buy / Sell Bonding Curve Interface */}
            <div className="liquid-glass border border-white/10 rounded-3xl p-4 relative overflow-hidden">
              {/* Tab options inside Buy panel */}
              {!stagedChannel.tdaEndTime && (
                <div className="flex border-b border-white/5 pb-3 mb-4">
                  <button
                    onClick={() => setIsBuying(true)}
                    className={`flex-1 pb-2 font-display text-center text-xs tracking-wider transition-all border-b ${
                      isBuying ? "text-white font-bold border-white" : "text-neutral-500 border-transparent"
                    }`}
                  >
                    {t("BUY ASSET", "КУПИТЬ АКТИВ")}
                  </button>
                  <button
                    onClick={() => setIsBuying(false)}
                    className={`flex-1 pb-2 font-display text-center text-xs tracking-wider transition-all border-b ${
                      !isBuying ? "text-white font-bold border-white" : "text-neutral-500 border-transparent"
                    }`}
                  >
                    {t("SELL OUT", "ПРОДАТЬ ВСЁ")}
                  </button>
                </div>
              )}

              {stagedChannel.tdaProgress < 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex flex-col gap-2 items-center text-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500 opacity-80" />
                  <span className="text-red-400 font-mono text-sm tracking-wider font-bold">{t("TWA FAILED", "TWA ЗАВЕРШЕНО НЕУДАЧНО")}</span>
                  <p className="text-neutral-400 text-xs">
                    {t("The offering did not reach the 70% soft cap threshold before timeout. All invested allocation has been refunded.", "Размещение не достигло минимального порога 70% до конца срока. Все заблокированные средства возвращены инвесторам.")}
                  </p>
                </div>
              )}

              {stagedChannel.tdaEndTime && stagedChannel.tdaProgress >= 0 ? (
                (() => {
                  const existingApp = investorApplications.find(a => a.channelId === stagedChannel.id);
                  if (existingApp) {
                    return (
                      <div className="space-y-4">
                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-neutral-400">{t("STATUS:", "СТАТУС:")}</span>
                            <span className="text-amber-400">{t("PENDING ALLOCATION", "ОЖИДАЕТ РАСПРЕДЕЛЕНИЯ")}</span>
                          </div>
                          {stagedChannel.tdaEndTime && (
                            <div className="flex flex-col gap-2 mb-3 mt-1 py-3 border-y border-white/5">
                              <div className="flex justify-between items-center text-xs font-mono">
                                <span className="text-neutral-400">{t("START:", "НАЧАЛО:")}</span>
                                <span className="text-neutral-200">{getStartDateFormatted(stagedChannel.tdaEndTime, stagedChannel.countdownHours)}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs font-mono">
                                <span className="text-neutral-400">{t("END:", "КОНЕЦ:")}</span>
                                <span className="text-neutral-200">{getEndDateFormatted(stagedChannel.tdaEndTime)}</span>
                              </div>
                            </div>
                          )}
                          {stagedChannel.tdaEndTime && (
                            <div className="flex justify-between items-center text-xs font-mono">
                              <span className="text-neutral-400">{t("ENDS IN:", "ДО КОНЦА:")}</span>
                              <span className="text-emerald-400">{getRemainingTimeFormatted(stagedChannel.tdaEndTime)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-neutral-400">{t("REQUESTED:", "К ПОКУПКЕ:")}</span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleModifyTda(existingApp.id, stagedChannel, -100)}
                                className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-neutral-300 font-bold"
                              >
                                -
                              </button>
                              <span className="text-white min-w-[70px] text-center font-bold">{existingApp.requestedShares} {t("Shares", "акций")}</span>
                              <button
                                onClick={() => handleModifyTda(existingApp.id, stagedChannel, 100)}
                                className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-sky-400 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-neutral-400">{t("RESERVED:", "ЗАБЛОКИРОВАНО:")}</span>
                            <span className="text-white">{formatNumber(existingApp.reservedTon, 2)} USDT</span>
                          </div>
                        </div>
                        {tradeSuccessMsg && (
                          <div className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white text-center font-mono">
                            {tradeSuccessMsg}
                          </div>
                        )}
                        <button
                          onClick={() => handleCancelTda(existingApp.id)}
                          className="w-full py-3.5 rounded-xl font-sans font-bold text-xs tracking-wider uppercase transition-all bg-white hover:bg-neutral-200 text-black border border-transparent cursor-pointer"
                        >
                          {t("Cancel Application", "Отменить заявку")}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {stagedChannel.tdaEndTime && (
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col gap-2 text-xs font-mono mb-2">
                          <div className="flex justify-between items-center text-neutral-400">
                            <span>{t("START:", "НАЧАЛО:")}</span>
                            <span className="text-neutral-200">{getStartDateFormatted(stagedChannel.tdaEndTime, stagedChannel.countdownHours)}</span>
                          </div>
                          <div className="flex justify-between items-center text-neutral-400">
                            <span>{t("END:", "КОНЕЦ:")}</span>
                            <span className="text-neutral-200">{getEndDateFormatted(stagedChannel.tdaEndTime)}</span>
                          </div>
                        </div>
                      )}
                      
                      {stagedChannel.tdaEndTime && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex justify-between items-center text-xs font-mono">
                          <span className="text-emerald-500/80">{t("TIME REMAINING:", "ВРЕМЯ ДО ЗАВЕРШЕНИЯ:")}</span>
                          <span className="text-emerald-400 font-bold">{getRemainingTimeFormatted(stagedChannel.tdaEndTime)}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-400 font-mono">{t("SPECIFY SHARES", "УКАЖИТЕ КОЛИЧЕСТВО АКЦИЙ")}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setTradeAmount((prev) => Math.max(1, (parseFloat(prev || "0") - 10)).toString())}
                            className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-neutral-300 font-bold"
                          >
                            -
                          </button>
                          <div className="flex items-center gap-2 bg-neutral-900 border border-white/5 px-2 py-1 rounded-xl">
                            <input
                              type="number"
                              value={tradeAmount}
                              onChange={(e) => setTradeAmount(e.target.value)}
                              className="bg-transparent text-center font-mono text-sm w-16 text-white focus:outline-none"
                            />
                            <span className="text-[10px] font-mono text-neutral-500">{t("SHARES", "АКЦИЙ")}</span>
                          </div>
                          <button
                            onClick={() => setTradeAmount((prev) => (parseFloat(prev || "0") + 10).toString())}
                            className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-sky-400 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        <span className="text-xs text-neutral-400 font-mono">{t("ESTIMATED RESERVATION", "ОЦЕНОЧНАЯ БЛОКИРОВКА")}</span>
                        <span className="font-mono text-sm text-neutral-200">
                          {formatNumber(parseFloat(tradeAmount || "0") * stagedChannel.sharePrice, 2)} USDT
                        </span>
                      </div>

                      {tradeSuccessMsg && (
                        <div className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white text-center font-mono">
                          {tradeSuccessMsg}
                        </div>
                      )}

                      <button
                        onClick={() => handleApplyTda(stagedChannel)}
                        className="w-full py-3.5 rounded-xl font-sans font-bold text-xs tracking-wider uppercase transition-all bg-white hover:bg-neutral-200 text-black border border-transparent cursor-pointer"
                      >
                        {t("Apply for TWA", "Подать заявку на TWA")}
                      </button>

                      <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                        <span>{t("Available Balance:", "Доступный баланс:")} {formatNumber(tonBalance, 2)} USDT</span>
                      </div>
                    </div>
                  );
                })()
              ) : !stagedChannel.tdaEndTime && stagedChannel.tdaProgress >= 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-mono">{t("SPECIFY SHARES", "УКАЖИТЕ КОЛИЧЕСТВО АКЦИЙ")}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTradeAmount((prev) => Math.max(1, (parseFloat(prev || "0") - 10)).toString())}
                        className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-neutral-300 font-bold"
                      >
                        -
                      </button>
                      <div className="flex items-center gap-2 bg-neutral-900 border border-white/5 px-2 py-1 rounded-xl">
                        <input
                          type="number"
                          value={tradeAmount}
                          onChange={(e) => setTradeAmount(e.target.value)}
                          className="bg-transparent text-center font-mono text-sm w-16 text-white focus:outline-none"
                        />
                        <span className="text-[10px] font-mono text-neutral-500">{t("SHARES", "АКЦИЙ")}</span>
                      </div>
                      <button
                        onClick={() => setTradeAmount((prev) => (parseFloat(prev || "0") + 10).toString())}
                        className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-sky-400 font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-xs text-neutral-400 font-mono">{t("ESTIMATED PRICE", "ОЦЕНОЧНАЯ СТОИМОСТЬ")}</span>
                    <span className="font-mono text-sm text-neutral-200">
                      {formatNumber(parseFloat(tradeAmount || "0") * stagedChannel.sharePrice, 2)} USDT
                    </span>
                  </div>

                  {tradeSuccessMsg && (
                    <div className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white text-center font-mono">
                      {tradeSuccessMsg}
                    </div>
                  )}

                  <button
                    onClick={() => handleTrade(stagedChannel)}
                    className="w-full py-3.5 rounded-xl font-sans font-bold text-xs tracking-wider uppercase transition-all bg-white hover:bg-neutral-200 text-black border border-transparent cursor-pointer"
                  >
                    {isBuying ? t("Transact Buy Order", "Отправить ордер на покупку") : t("Transact Sell Liquidate", "Отправить ордер на продажу")}
                  </button>

                  <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                    <span>{t("Available Balance:", "Доступный баланс:")} {formatNumber(tonBalance, 2)} USDT</span>
                    <span>
                      {t("Owned:", "В собственности:")} {formatNumber(holdings.find((h) => h.channelId === stagedChannel.id)?.sharesOwned || 0, 0)} {t("Shares", "акций")}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>



            {/* 1. ВСЕ ПРО ПРОЕКТ / КАНАЛ */}
            <div className="space-y-3 mt-8">
              <h4 className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">{t("Project Profile & Audience", "О проекте и Аудитория")}</h4>
              <div className="liquid-glass rounded-2xl p-4 border border-white/5 space-y-4">
                <p className="text-[11px] leading-relaxed text-neutral-300">
                  {language === "ru" ? (stagedChannel.descriptionRu || "Описание проекта отсутствует.") : (stagedChannel.descriptionEn || "No project description provided.")}
                </p>
                <div className="grid grid-cols-2 gap-y-3 font-mono text-[11px]">
                  <div>
                    <span className="text-neutral-500 block text-[9px] mb-0.5">{t("Founder", "Основатель")}</span>
                    <span>{stagedChannel.founder || "Anonymous"}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px] mb-0.5">{t("Direct Link", "Прямая ссылка")}</span>
                    <a href={`https://t.me/${stagedChannel.handle}`} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">
                      t.me/{stagedChannel.handle} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px] mb-0.5">{t("Age", "Дата создания")}</span>
                    <span>{stagedChannel.channelAge || "2 Years"}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px] mb-0.5">{t("Category", "Целевая аудитория")}</span>
                    <span>{stagedChannel.category} / B2C</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <span className="text-neutral-500 block text-[9px] font-mono mb-1">{t("Subscribers", "Пользователи/Подписчики")}</span>
                    <span className="text-white font-bold text-sm tracking-tight">{stagedChannel.subscribers}</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <span className="text-neutral-500 block text-[9px] font-mono mb-1">{t("Views/Post", "Охват поста/DAU")}</span>
                    <span className="text-white font-bold text-sm tracking-tight">{stagedChannel.viewsPerPost || "12K"}</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <span className="text-neutral-500 block text-[9px] font-mono mb-1">{t("ERR", "Вовлеченность (ERR)")}</span>
                    <span className="text-emerald-400 font-bold font-mono text-sm">
                      {stagedChannel.subscriberCount > 0 ? ((parseInt((stagedChannel.viewsPerPost || "12000").replace(/\D/g, '')) / stagedChannel.subscriberCount) * 100).toFixed(1) : "24.5"}%
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <span className="text-neutral-500 block text-[9px] font-mono mb-1">{t("Growth 30d", "Динамика (30д)")}</span>
                    <span className="text-emerald-400 font-bold font-mono text-sm">+4.2%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. ФИНАНСОВЫЕ ПОКАЗАТЕЛИ МЕТРИКИ */}
            <RevenueFinanceCard stagedChannel={stagedChannel} t={t} formatNumber={formatNumber} />

            {/* 3. ГОЛОСОВАНИЯ И УПРАВЛЕНИЕ */}
            <div className="space-y-3 mt-6 mb-10">
              <h4 className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">{t("Governance & Voting", "Голосования и Управление")}</h4>
              <div className="liquid-glass rounded-2xl p-4 border border-white/5 space-y-4">
                <div className="flex gap-3 text-[11px] leading-relaxed text-neutral-300">
                  <Shield className="w-5 h-5 text-sky-400 shrink-0" />
                  <p>
                    {language === "ru" 
                      ? "Владельцы долей принимают решения по ключевым вопросам развития канала (например: смена тематики, распределение казначейства или частота рекламы) путем блокчейн-голосования. Вес голоса пропорционален количеству акций."
                      : "Shareholders make decisions on key channel development issues (e.g. topic changes, treasury distribution, ad frequency) via on-chain voting. Voting power is proportional to shares owned."}
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-xl p-3 text-xs font-mono">
                  <div className="flex justify-between mb-2">
                    <span className="text-neutral-400">{t("Voting Power Distribution", "Распределение голосов")}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden flex w-full mb-1">
                    <div className="bg-amber-400 h-full" style={{ width: `${stagedChannel.founderOwnershipPercent}%` }} />
                    <div className="bg-sky-400 h-full" style={{ width: `${stagedChannel.floatPercent}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] mt-1">
                    <span className="text-amber-400 truncate pr-2 max-w-[60%]">@{stagedChannel.founder || stagedChannel.handle}: {stagedChannel.founderOwnershipPercent}%</span>
                    <span className="text-sky-400 shrink-0">{t("Community:", "Инвесторы:")} {stagedChannel.floatPercent}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. КОНТЕКСТ И РЫНОК */}
            <div className="space-y-3 mt-6 mb-10">
              <h4 className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">{t("Market Context", "Контекст и Рынок")}</h4>
              <div className="liquid-glass rounded-2xl p-4 border border-white/5">
                <button className="w-full py-3 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded-xl flex items-center justify-center gap-2 font-bold font-sans tracking-wide text-xs transition-colors">
                  <Users className="w-4 h-4" />
                  {t("Join Investor Chat", "Перейти в чат инвесторов")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* ----------------- TAB 1: MARKET SCREEN ----------------- */}
            {activeTab === "market" && (
              <div id="market-viewport" className="space-y-3.5 page-fade-enter">
                
                {/* NEWS SLIDER COVER CARD (Full width, draggable horizontal flow) */}
                {(() => {
                  const activeNews = newsList;
                  if (activeNews.length === 0) return null;
                  const safeIndex = currentNewsIndex >= activeNews.length ? 0 : currentNewsIndex;

                  return (
                    <div 
                      onMouseEnter={() => setIsHoveringNews(true)}
                      onMouseLeave={() => setIsHoveringNews(false)}
                      className="relative bg-[#18181C] border border-white/5 rounded-2xl overflow-hidden shadow-2xl w-full group flex flex-col touch-pan-y"
                    >
                      {/* Viewport for active news content (Premium height with continuous dragging) */}
                      <div className="relative h-[135px] w-full overflow-hidden bg-[#151517]">
                        
                        {/* Left & Right navigation buttons (Overlaid) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSlideDirection(-1);
                            setCurrentNewsIndex((prev) => (prev - 1 + activeNews.length) % activeNews.length);
                            setLastManualInteract(Date.now());
                          }}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-7 h-7 rounded-full bg-black/60 border border-white/10 text-neutral-400 hover:text-white hover:bg-black/90 active:scale-95 transition-all cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSlideDirection(1);
                            setCurrentNewsIndex((prev) => (prev + 1) % activeNews.length);
                            setLastManualInteract(Date.now());
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-7 h-7 rounded-full bg-black/60 border border-white/10 text-neutral-400 hover:text-white hover:bg-black/90 active:scale-95 transition-all cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Continuous Horizontal Scrollable Track */}
                        <div
                          className={`flex h-full select-none cursor-grab active:cursor-grabbing ${isPanningNews ? "" : "transition-transform duration-[400ms] ease-[cubic-bezier(0.2,1,0.3,1)]"}`}
                          style={{
                            width: `${activeNews.length * 100}%`,
                            transform: `translateX(calc(-${(safeIndex * 100) / activeNews.length}% + ${dragX}px))`,
                            touchAction: "pan-y",
                          }}
                          onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            setIsHoveringNews(true);
                            setDragStartX(e.clientX);
                            setDragStartY(e.clientY);
                            setDragDirectionLocked("none");
                            setIsPanningNews(true);
                            e.currentTarget.setPointerCapture(e.pointerId);
                          }}
                          onPointerMove={(e) => {
                            if (dragStartX === null || dragStartY === null) return;
                            
                            const currentX = e.clientX;
                            const currentY = e.clientY;
                            const deltaX = currentX - dragStartX;
                            const deltaY = currentY - dragStartY;

                            if (dragDirectionLocked === "none") {
                              const absX = Math.abs(deltaX);
                              const absY = Math.abs(deltaY);
                              if (absX > 8 || absY > 8) {
                                if (absX > absY) {
                                  setDragDirectionLocked("horizontal");
                                } else {
                                  setDragDirectionLocked("vertical");
                                  setIsPanningNews(false);
                                  setDragStartX(null);
                                  setDragStartY(null);
                                  return;
                                }
                              } else {
                                return;
                              }
                            }

                            if (dragDirectionLocked === "horizontal") {
                              setDragX(deltaX);
                            }
                          }}
                          onPointerUp={(e) => {
                            if (dragStartX === null) return;
                            e.currentTarget.releasePointerCapture(e.pointerId);
                            setIsPanningNews(false);

                            const finalDragX = dragX;
                            const isHorizontal = dragDirectionLocked === "horizontal";

                            setDragStartX(null);
                            setDragStartY(null);
                            setDragDirectionLocked("none");
                            setDragX(0);

                            if (isHorizontal) {
                              const swipeThreshold = 55;
                              if (finalDragX < -swipeThreshold) {
                                setSlideDirection(1);
                                setCurrentNewsIndex((prev) => (prev + 1) % activeNews.length);
                                setLastManualInteract(Date.now());
                              } else if (finalDragX > swipeThreshold) {
                                setSlideDirection(-1);
                                setCurrentNewsIndex((prev) => (prev - 1 + activeNews.length) % activeNews.length);
                                setLastManualInteract(Date.now());
                              }
                            }
                          }}
                          onPointerCancel={(e) => {
                            if (dragStartX === null) return;
                            e.currentTarget.releasePointerCapture(e.pointerId);
                            setIsPanningNews(false);
                            setDragStartX(null);
                            setDragStartY(null);
                            setDragDirectionLocked("none");
                            setDragX(0);
                          }}
                        >
                          {activeNews.map((slide, index) => (
                            <div
                              key={index}
                              style={{ width: `${100 / activeNews.length}%` }}
                              className="h-full shrink-0 relative cursor-grab active:cursor-grabbing select-none overflow-hidden"
                            >
                              {slide.coverImg ? (
                                slide.coverImg.startsWith("data:") ? (
                                  <img
                                    src={slide.coverImg}
                                    alt="News content"
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                  />
                                ) : (
                                  <Image
                                    src={slide.coverImg}
                                    alt="News content"
                                    fill
                                    className="object-cover pointer-events-none"
                                    referrerPolicy="no-referrer"
                                    unoptimized={!slide.coverImg.includes("picsum.photos") && !slide.coverImg.includes("unsplash.com")}
                                  />
                                )
                              ) : (
                                <div className={`absolute inset-0 bg-gradient-to-br ${slide.bgClass || "from-neutral-900 to-neutral-950"} flex items-center justify-center`}>
                                  <span className="text-[11px] font-mono text-neutral-500">Image Slider</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                      </div>
                    </div>
                  );
                })()}

                {/* SEARCH & FILTERS CONTROLS (Search is exactly half, filters occupy the remaining half) */}
                <div className="flex items-center gap-2 w-full">
                  {/* Search block - Exactly 50% width */}
                  <div className="w-1/2 relative flex items-center bg-[#1E1E1E] border border-white/5 rounded-2xl px-2.5 py-1.5 focus-within:border-white/10 transition-all">
                    <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 mr-1.5" />
                    <input
                      type="text"
                      placeholder={t("Search...", "Поиск...")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent w-full text-[10px] text-white placeholder-neutral-500 focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-[10px] text-neutral-400 hover:text-white ml-1 font-sans"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filters block - Exactly the other 50% width */}
                  <div className="w-1/2 flex items-center gap-1">
                    {/* Stage selector: All / TDA / Trading */}
                    <select
                      value={marketSegment}
                      onChange={(e) => setMarketSegment(e.target.value as any)}
                      className="flex-1 min-w-0 bg-[#1E1E1E] border border-white/5 rounded-2xl px-1.5 py-1.5 text-[9px] text-neutral-300 font-mono focus:outline-none cursor-pointer truncate"
                    >
                      <option value="All">{t("All", "Все")}</option>
                      <option value="TDA">TWA</option>
                      <option value="Secondary">{t("Trading", "Биржа")}</option>
                    </select>

                    {/* Sorting criteria options */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="flex-1 min-w-0 bg-[#1E1E1E] border border-white/5 rounded-2xl px-1.5 py-1.5 text-[9px] text-neutral-300 font-mono focus:outline-none cursor-pointer truncate"
                    >
                      <option value="name">A-Z</option>
                      <option value="price">{t("Price", "Цена")}</option>
                      <option value="change">{t("Income", "Доход")}</option>
                      <option value="subs">{t("Subs", "Люди")}</option>
                    </select>

                    {/* Main category dropdown filters */}
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="flex-1 min-w-0 bg-[#1E1E1E] border border-white/5 rounded-2xl px-1.5 py-1.5 text-[9px] text-neutral-300 font-mono focus:outline-none cursor-pointer truncate"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {t(cat, cat === "All" ? "Все" : cat === "USDT Ecosystem" ? "USDT" : cat === "VC & Startups" ? "Старт" : cat === "Entertainment" ? "Шоу" : "Тех")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* LIVE TDA CAROUSEL */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">{t("Live TWA", "Активные TWA")}</h2>
                    </div>
                  </div>

                  <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sticky-scroll no-scrollbar">
                    {filteredChannels.filter(c => c.tdaProgress >= 0 && c.tdaProgress < 100).map((tda) => (
                      <div
                        key={tda.id}
                        onClick={() => setStagedChannel(tda)}
                        className="shrink-0 w-[240px] bg-[#1E1E1E] border border-white/5 rounded-2xl p-4 cursor-pointer relative transition-all hover:border-white/15"
                      >
                        {/* Channel Header Avatar */}
                        <div className="flex gap-2.5 items-center mb-2">
                          <div className="w-8 h-8 rounded-lg bg-[#232323] border border-white/10 flex items-center justify-center font-bold text-xs text-neutral-300 font-mono">
                            {tda.channelName.substring(0, 1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-sans font-semibold text-xs text-white truncate">{tda.channelName}</h4>
                            <span className="text-[9px] text-neutral-400 font-mono block truncate">@{tda.handle}</span>
                          </div>
                        </div>

                        <div className="mb-2.5 w-full bg-[#232323] overflow-hidden h-1.5 rounded-full border border-white/5">
                          <div className={tda.tdaProgress > 100 ? "bg-amber-400 h-full rounded-full transition-all" : "bg-emerald-500 h-full rounded-full transition-all"} style={{ width: `${Math.min(100, Math.max(0, tda.tdaProgress))}%` }} />
                        </div>

                        {/* Subscribers, Valuation, Income grid */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 my-2.5 text-[10px] border-y border-white/5 py-2 font-mono">
                          <div>
                            <span className="text-[8px] text-neutral-500 block uppercase">{t("SUBSCRIBERS", "ПОДПИСЧИКИ")}</span>
                            <span className="text-white font-bold">{tda.subscribers}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-neutral-500 block uppercase">{t("VALUATION", "ОЦЕНКА")}</span>
                            <span className="text-white font-bold">{formatNumber(tda.valuation)} USDT</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-neutral-500 block uppercase">{t("MO. REVENUE", "МЕС. ДОХОД")}</span>
                            <span className="text-white font-bold">~{formatNumber(Math.round(tda.monthlyRevenue))} USDT</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-neutral-500 block uppercase">{t("YIELD RATE", "ДОХОДНОСТЬ")}</span>
                            <span className="text-white font-bold">{tda.yieldPercent}% APY</span>
                          </div>
                        </div>



                        {/* Participate widget */}
                        <div className="flex justify-between items-center mt-3 border-t border-white/5 pt-2 font-mono text-[10px]">
                          <span className="text-neutral-400 text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {isHydrated && tda.tdaEndTime ? getRemainingTimeFormatted(tda.tdaEndTime) : `${tda.countdownHours}${t("h Left", "ч осталось")}`}
                          </span>
                          <span className="text-white font-bold text-[9px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">{t("Participate", "Участвовать")}</span>
                        </div>
                      </div>
                    ))}

                    {filteredChannels.filter(c => c.tdaProgress >= 0 && c.tdaProgress < 100).length === 0 && (
                      <div className="w-full p-8 text-center bg-[#1E1E1E] border border-white/5 rounded-3xl space-y-2">
                        <span className="text-neutral-400 font-mono text-xs block">
                          {t("No active channel TWAs found", "В этой категории нет активных TWA")}
                        </span>
                        <p className="text-neutral-500 text-[10px] max-w-sm mx-auto leading-normal">
                          {t("All channel listings are verified and approved by the centralized network administration.", "Все размещения каналов проходят верификацию и одобрение централизованной администрацией сети.")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECONDARY TRADING MAIN BOARD */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">{t("Share Trading", "Торговля акциями")}</h2>
                  </div>

                  <div className="space-y-2">
                    {filteredChannels.filter((c) => c.tdaProgress === 100).map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setStagedChannel(c)}
                        className="flex items-center justify-between p-3 bg-[#1E1E1E] border border-white/5 rounded-2xl hover:bg-white/[0.03] hover:border-white/10 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Solid Gray Avatar */}
                          <div className="w-10 h-10 rounded-xl bg-[#232323] border border-white/5 flex items-center justify-center font-bold text-sm text-neutral-400 shrink-0">
                            {c.channelName.substring(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-sans font-semibold text-xs text-white truncate">{c.channelName}</h3>
                            <span className="text-[10px] font-mono text-neutral-500 block truncate">@{c.handle}</span>
                          </div>
                        </div>

                        {/* Little SVG Trend Graphics sparkline */}
                        <div className="px-2 shrink-0 hidden xs:block">
                          <svg className="w-12 h-6" viewBox="0 0 50 20">
                            {c.priceChange24h >= 0 ? (
                              <path d="M0,15 Q12,5 25,12 T50,2" fill="none" stroke="#A3A3A3" strokeWidth="1.5" />
                            ) : (
                              <path d="M0,2 Q12,15 25,8 T50,18" fill="none" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" />
                            )}
                          </svg>
                        </div>

                        {/* Price change */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right font-mono">
                            <div className="text-xs font-bold text-white mb-0.5">{formatNumber(c.sharePrice, 4)} USDT</div>
                            <span className={`text-[9.5px] font-bold flex items-center justify-end gap-0.5 font-mono ${
                              c.priceChange24h >= 0 ? "text-white" : "text-neutral-500"
                            }`}>
                              {c.priceChange24h >= 0 ? <TrendingUp className="w-2.5 h-2.5 text-neutral-300" /> : <TrendingDown className="w-2.5 h-2.5 text-neutral-500" />}
                              {c.priceChange24h >= 0 ? "+" : ""}{c.priceChange24h}%
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-neutral-600" />
                        </div>
                      </div>
                    ))}

                    {filteredChannels.filter((c) => c.tdaProgress === 100).length === 0 && (
                      <div className="p-8 text-center text-neutral-500 text-xs font-mono bg-[#1E1E1E] border border-white/5 rounded-2xl">
                        {t("No assets released for secondary trading yet", "Нет выпущенных акций для вторичной торговли")}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* ----------------- TAB 2: PORTFOLIO SCREEN ----------------- */}
            {activeTab === "portfolio" && (
              <div id="portfolio-viewport" className="space-y-6 page-fade-enter">
                
                {/* Clean Centered Balance Display without Grey Shell Container */}
                {(() => {
                  const totalStocksVal = holdings.reduce((sum, h) => {
                    const channel = channels.find((c) => c.id === h.channelId);
                    return sum + h.sharesOwned * (channel?.sharePrice || 0);
                  }, 0);
                  const totalValTON = tonBalance + totalStocksVal;

                  const dailyChangePercent = holdings.length > 0 ? "+2.45%" : "+0.00%";

                  return (
                    <div className="flex flex-col items-center justify-center text-center mt-2 mb-5 bg-[#1E1E1E] border border-white/5 rounded-3xl p-5 pb-7 w-full hover:bg-white/[0.02] transition-colors relative cursor-default shadow-lg">
                      {/* Quiet title label */}
                      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1 font-bold select-none">
                        {t("MINT WALLET", "MINT WALLET")}
                      </span>

                      {/* Balance & 24h change side by side */}
                      <div className="flex items-center justify-center gap-1.5 w-full mt-1">
                        <h1 className="text-4xl font-sans font-extrabold text-white tracking-tight leading-none">
                          ${totalValTON > 1000 ? formatNumber(totalValTON, 0) : formatNumber(totalValTON, 2)}
                        </h1>
                        {holdings.length > 0 && (
                          <div className={`text-sm font-bold font-sans mt-0.5 leading-none tracking-tight drop-shadow-md ${dailyChangePercent.startsWith('-') ? 'text-[#FF2A2A]' : 'text-[#00FF55]'}`}>
                            {dailyChangePercent}
                          </div>
                        )}
                      </div>

                      {investorApplications.length > 0 && (
                        <div className="mt-3 text-[10px] font-sans text-neutral-400 font-bold bg-[#18181C] border border-white/5 px-3 py-1.5 rounded-full inline-block">
                          {t("Reserved for TWA:", "Заблокировано под TWA:")} {formatNumber(investorApplications.reduce((sum, a) => sum + (a.reservedTon || 0), 0), 2)} USDT
                        </div>
                      )}

                      {/* Deposit and Withdraw Pill Buttons */}
                      <div className="grid grid-cols-2 gap-2 w-full mt-4">
                        {/* 1. Green "Пополнить +" Button */}
                        <button
                          onClick={() => {
                            if (!walletConnected) {
                              tonConnectUI.openModal();
                              return;
                            }
                            setWalletAction(walletAction === "deposit" ? null : "deposit");
                            setWalletAmount("");
                            setWalletActionError(null);
                          }}
                          className="w-full h-10 hover:opacity-90 active:scale-[0.97] text-xs rounded-full font-sans font-bold flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer focus:outline-none"
                          style={{ backgroundColor: '#22C55E', color: '#ffffff', border: 'none' }}
                        >
                          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{t("Deposit", "Пополнить")}</span>
                          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
                            <Plus className="w-3 h-3 stroke-[3]" style={{ color: '#22C55E' }} />
                          </div>
                        </button>

                        {/* 2. Grey "Вывод ↑" Button */}
                        <button
                          onClick={() => {
                            if (!walletConnected) {
                              tonConnectUI.openModal();
                              return;
                            }
                            setWalletAction(walletAction === "withdraw" ? null : "withdraw");
                            setWalletAmount("");
                            setWalletActionError(null);
                          }}
                          className="w-full h-10 hover:opacity-90 active:scale-[0.97] text-xs rounded-full font-sans font-bold flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer focus:outline-none"
                          style={{ backgroundColor: '#52525B', color: '#ffffff', border: 'none' }}
                        >
                          <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{t("Withdraw", "Вывод")}</span>
                          <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: '#ffffff' }} />
                        </button>
                      </div>

                      {/* Inline Control State Forms for transaction execution */}
                      {(walletAction || walletActionSuccess) && (
                        <div className="w-full mt-5 space-y-3.5 text-left">
                        {/* Interactive Wallet Form Drawer */}
                        {walletAction && (
                          <div className="bg-[#232323] p-3.5 rounded-2xl border border-white/5 space-y-3 shadow-xl page-fade-enter">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
                                {walletAction === "deposit"
                                  ? t("Deposit USDT Amount", "Сумма пополнения USDT")
                                  : t("Withdraw USDT Amount", "Сумма вывода USDT")
                                }
                              </span>
                              <span className="text-[10px] font-mono text-neutral-400 font-semibold">
                                {t("Available", "Доступно")}: {formatNumber(tonBalance, 2)} USDT
                              </span>
                            </div>

                            <div className="flex gap-2">
                              <div className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3.5 py-2 flex items-center justify-between">
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={walletAmount}
                                  onChange={(e) => {
                                    setWalletAmount(e.target.value);
                                    setWalletActionError(null);
                                  }}
                                  className="bg-transparent text-white font-mono text-sm focus:outline-none w-full"
                                />
                                <span className="text-[10px] text-neutral-400 font-bold font-mono">USDT</span>
                              </div>
                              <button
                                onClick={() => {
                                  const val = walletAction === "deposit" ? "500" : tonBalance.toFixed(0);
                                  setWalletAmount(val);
                                  setWalletActionError(null);
                                }}
                                className="bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-xl text-[10px] font-semibold border border-white/5 font-mono"
                              >
                                {walletAction === "deposit" ? "+500" : "MAX"}
                              </button>
                            </div>

                            {walletActionError && (
                              <p className="text-[10px] text-red-400 font-mono italic">{walletActionError}</p>
                            )}

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => {
                                  setWalletAction(null);
                                  setWalletAmount("");
                                  setWalletActionError(null);
                                }}
                                className="flex-1 bg-neutral-900 border border-white/5 hover:bg-neutral-800 text-neutral-400 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
                              >
                                {t("Cancel", "Отмена")}
                              </button>
                              <button
                                onClick={() => {
                                  const amt = parseFloat(parseFloat(walletAmount).toFixed(4));
                                  if (isNaN(amt) || amt < 0.01) {
                                    setWalletActionError(t("Minimum amount is 0.01 USDT", "Минимальная сумма — 0.01 USDT"));
                                    return;
                                  }

                                  const currentVisitorRecord = users.find((u) => u.id === "user_current");
                                  if (currentVisitorRecord && currentVisitorRecord.status === "banned") {
                                    setWalletActionError(language === "ru" 
                                      ? "Ваш счет заблокирован по соображениям безопасности" 
                                      : "Wallet actions deactivated. Your account is suspended.");
                                    return;
                                  }

                                  if (walletAction === "deposit" && systemSettings.depositsFrozen) {
                                    setWalletActionError(language === "ru" 
                                      ? "Ввод средств заморожен политикой ограничений" 
                                      : "Deposits are temporarily frozen by risk settings.");
                                    return;
                                  }

                                  if (walletAction === "deposit") {
                                    setTonBalance((prev) => prev + amt);
                                    const newAct: ActivityLog = {
                                      id: `dep-${Date.now()}`,
                                      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
                                      channelName: "WALLETHUB",
                                      details: `${t("Deposited", "Пополнение")} +${formatNumber(amt, 2)} USDT ${t("via Connected Wallet.", "из подключенного кошелька.")}`,
                                      amountTON: amt,
                                      type: "DIVIDEND_PAYOUT"
                                    };
                                    setActivity((prev) => [newAct, ...prev]);
                                    setWalletActionSuccess(`${t("Deposited", "Пополнено")} +${formatNumber(amt, 2)} USDT`);
                                    setTimeout(() => setWalletActionSuccess(null), 3000);
                                  } else {
                                    if (tonBalance < amt) {
                                      setWalletActionError(t("Insufficient USDT balance", "Недостаточно USDT на балансе"));
                                      return;
                                    }
                                    setTonBalance((prev) => prev - amt);
                                    const newAct: ActivityLog = {
                                      id: `wth-${Date.now()}`,
                                      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
                                      channelName: "WALLETHUB",
                                      details: `${t("Withdrew", "Вывод средств")} -${formatNumber(amt, 2)} USDT ${t("to address.", "на подключенный кошелек.")}`,
                                      amountTON: amt,
                                      type: "SELL"
                                    };
                                    setActivity((prev) => [newAct, ...prev]);
                                    setWalletActionSuccess(`${t("Withdrew", "Выведено")} -${formatNumber(amt, 2)} USDT`);
                                    setTimeout(() => setWalletActionSuccess(null), 3000);
                                  }
                                  setWalletAction(null);
                                  setWalletAmount("");
                                  setWalletActionError(null);
                                }}
                                className="flex-1 bg-white hover:bg-neutral-100 text-black py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
                              >
                                {t("Confirm", "Подтвердить")}
                              </button>
                            </div>
                          </div>
                        )}

                        {walletActionSuccess && (
                          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-2.5 rounded-xl text-center text-[10px] font-mono font-medium flex items-center justify-center gap-1.5 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            {walletActionSuccess}
                          </div>
                        )}
                        </div>
                      )}

                      {/* Connected network address line - Positioned absolutely overlapping bottom */}
                      <div 
                        className="flex items-center justify-between font-mono absolute -bottom-2 w-[55%] left-0 right-0 mx-auto shadow-lg shadow-[#0082c8]/20 rounded-full pl-3 pr-1 py-0.5 z-10"
                        style={{ backgroundColor: '#0082c8', color: '#ffffff', border: 'none' }}
                      >
                        <span className="flex items-center gap-2 flex-grow mr-2 overflow-hidden">
                          <Wallet className="w-3 h-3 shrink-0 text-white" />
                          <span className="truncate block text-[9.5px] font-bold leading-tight">
                            {walletConnected ? (walletAddress ? `${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)}` : t("Connected", "Подключен")) : t("Wallet Not Connected", "Кошелек не подключен")}
                          </span>
                        </span>
                        <div className="relative shrink-0 flex items-center">
                          <button
                            onClick={() => setShowWalletEdit(!showWalletEdit)}
                            className="w-5 h-5 hover:opacity-80 active:scale-[0.97] rounded-full flex items-center justify-center transition-all cursor-pointer focus:outline-none border border-white shadow-sm"
                            style={{ backgroundColor: 'transparent', color: '#ffffff' }}
                            title={t("Edit", "Изменить")}
                          >
                            <Pencil className="w-2.5 h-2.5 stroke-[3]" style={{ color: '#ffffff' }} />
                          </button>
                          
                          {showWalletEdit && (
                            <div className="absolute right-0 bottom-full mb-1 bg-[#2a2a2a] border border-white/10 rounded-xl shadow-2xl w-32 overflow-hidden z-20 flex flex-col font-sans">
                              {!walletConnected ? (
                                <button
                                  onClick={() => {
                                    tonConnectUI.openModal();
                                    setShowWalletEdit(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[11px] font-semibold hover:bg-white/5 text-white active:bg-white/10 transition-colors"
                                >
                                  {t("Connect", "Подключить")}
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      tonConnectUI.disconnect();
                                      setShowWalletEdit(false);
                                      setWalletAction(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-[11px] font-bold hover:bg-white/5 text-red-400 active:bg-white/10 transition-colors"
                                  >
                                    {t("Unbind", "Отвязать")}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}



                {/* INVESTOR TDA APPLICATIONS SECTION */}
                {investorApplications.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">
                      {t("TWA Subscriptions", "Заявки на TWA")}
                    </h2>
                    <div className="bg-[#1E1E1E] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/[0.02]">
                      {investorApplications.map((app) => (
                        <div key={app.id} className="p-3.5 flex items-center justify-between">
                          <div>
                            <h3 className="font-sans font-bold text-[13px] text-white tracking-tight leading-none">{app.channelName}</h3>
                            <span className="text-[10px] font-mono text-amber-400 mt-1 block uppercase">
                              {app.status === "Pending Allocation" ? t("PENDING ALLOCATION", "ОЖИДАЕТ РАСПРЕДЕЛЕНИЯ") : app.status}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-[13px] font-bold tracking-tight text-white block leading-tight">
                              {app.requestedShares} {t("Shares", "АКЦИЙ")}
                            </span>
                            <span className="text-[10px] font-sans font-medium block text-neutral-500">
                              {t("Reserved:", "Резерв:")} {formatNumber(app.reservedTon, 2)} USDT
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ASSETS SECTION (Merged Tokens + Channel Shares, with USDT pinned at top) */}
                <div className="space-y-3">
                  {/* Header Title of combined Assets */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">
                      {t("Assets", "Активы")}
                    </h2>
                    <span className="text-[9px] font-mono text-neutral-500 uppercase">
                      {holdings.length + 1} {t("Positions", "ПОЗИЦИИ")}
                    </span>
                  </div>

                  <div className="bg-[#1E1E1E] border border-white/5 rounded-2xl overflow-hidden">
                    {/* 1. PINNED TETHER (Always at top) */}
                    <div className="p-3.5 flex items-center justify-between hover:bg-white/[0.01] transition-all">
                      <div className="flex items-center gap-3">
                        {/* Authentic USDT Logo */}
                        <div className="w-10 h-10 rounded-xl bg-[#26A17B] flex items-center justify-center shrink-0 shadow-lg">
                          <svg viewBox="0 0 339.43 295.27" xmlns="http://www.w3.org/2000/svg" className="w-[65%] h-[65%] drop-shadow-sm">
                            <path d="M191.19,144.8v0c-1.2.09-7.4,0.46-21.23,0.46-11,0-18.81-.33-21.55-0.46v0c-42.51-1.87-74.24-9.27-74.24-18.13s31.73-16.25,74.24-18.15v28.91c2.78,0.2,10.74.67,21.74,0.67,13.2,0,19.81-.55,21-0.66v-28.9c42.42,1.89,74.08,9.29,74.08,18.13s-31.65,16.24-74.08,18.12h0Zm0-39.25V79.68h59.2V40.23H89.21V79.68H148.4v25.86c-48.11,2.21-84.29,11.74-84.29,23.16s36.18,20.94,84.29,23.16v82.9h42.78V151.83c48-2.21,84.12-11.73,84.12-23.14s-36.09-20.93-84.12-23.15h0Zm0,0h0Z" fill="#fff" fillRule="evenodd"/>
                          </svg>
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="font-sans font-bold text-[13px] text-white tracking-tight leading-none">Tether (USDT)</h3>
                          <span className="text-[11px] font-sans text-neutral-400 block antialiased font-medium">
                            $1.00
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex flex-col justify-end space-y-0.5">
                        <span className="font-mono text-[13px] font-bold tracking-tight text-white block leading-tight">
                          {formatNumber(tonBalance, 2)}
                        </span>
                        <span className={`text-[10px] font-sans font-medium block tracking-tight text-neutral-500`}>
                          USDT
                        </span>
                      </div>
                    </div>

                    {holdings.length > 0 && (
                      <div className="w-[85%] mx-auto h-[1px] bg-white/10" />
                    )}

                    {/* 2. OTHER CHANNEL ASSETS / POSITIONS */}
                    <div className="divide-y divide-white/[0.02]">
                      {holdings.map((h, index) => {
                        const channel = channels.find((c) => c.id === h.channelId);
                        if (!channel) return null;

                      // Calculating pricing details for each share
                      const currentPriceValueTON = channel.sharePrice * h.sharesOwned;
                      const purchasePriceValueTON = h.avgBuyPrice * h.sharesOwned;
                      const profitLossAbsTON = currentPriceValueTON - purchasePriceValueTON;
                      const profitLossAbsUSD = profitLossAbsTON * TON_TO_USD;
                      const isProfit = profitLossAbsTON >= 0;

                      let avatarEl;
                      if (channel.avatarUrl) {
                        avatarEl = <img src={channel.avatarUrl} className="w-10 h-10 object-cover rounded-xl shrink-0 border border-white/10" alt="" referrerPolicy="no-referrer" />;
                      } else {
                        avatarEl = (
                          <div className="w-10 h-10 rounded-xl bg-[#232323] border border-white/10 flex items-center justify-center shrink-0">
                            <span className="font-mono text-neutral-300 text-sm font-bold uppercase">
                              {channel.channelName.substring(0, 1)}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={h.channelId}
                          onClick={() => setStagedChannel(channel)}
                          className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            {avatarEl}
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-sans font-bold text-[13px] text-white tracking-tight leading-none">
                                  {channel.channelName}
                                </h3>
                              </div>
                              <span className="text-[11px] font-sans text-neutral-400 block antialiased font-medium">
                                {displayCurrency === "USDT" ? `${formatNumber(channel.sharePrice, 2)} USDT` : `$${formatNumber(channel.sharePrice * TON_TO_USD, 2)}`}
                              </span>
                            </div>
                          </div>

                          <div className="text-right space-y-0.5 font-sans font-medium">
                            <span className="font-mono text-[13px] font-bold tracking-tight text-white block leading-tight">
                              {formatNumber(h.sharesOwned, 0)} {t("Shares", "шт.")}
                            </span>
                            <span className={`text-[10px] font-sans font-medium block tracking-tight text-neutral-400`}>
                              {displayCurrency === "USDT"
                                ? `${formatNumber(currentPriceValueTON, 2)} USDT`
                                : `${formatNumber(currentPriceValueTON * TON_TO_USD, 2)} $`
                              }
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    </div>

                    {holdings.length === 0 && (
                      <div className="text-center font-sans text-[11px] text-neutral-500 py-3 space-y-1">
                        <p>{t("No other assets purchased yet.", "У вас пока нет купленных акций медиа-каналов.")}</p>
                        <button
                          onClick={() => setActiveTab("market")}
                          className="text-[10px] text-sky-450 hover:underline font-semibold"
                        >
                          {t("Go to Market →", "Перейти на Биржу →")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* REGULATORY ACTIVITY TIMELINE */}
                <div className="space-y-3">
                  <h2 className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">
                    {t("Activity", "История транзакций")}
                  </h2>
                  
                  <div className="space-y-4 w-full h-auto">
                    {(() => {
                      // Helper to parse shares amount from description e.g., "Acquired 200 shares" -> "200 шт." or "200 pcs"
                      const parseShares = (details: string): string => {
                        const match = details.match(/(\d+)\s*(?:shares|акций|акции|pcs)/i);
                        if (match) {
                          return `${match[1]} ${language === "ru" ? "шт." : "pcs"}`;
                        }
                        return "";
                      };

                      // Categorize transaction type
                      const getTransactionInfo = (act: any) => {
                        const isBuy = act.type === "BUY";
                        const isSell = act.type === "SELL";
                        const desc = act.details.toLowerCase();
                        
                        const isDep =
                          (isBuy && act.channelName === "WALLETHUB") ||
                          act.type === "DIVIDEND_PAYOUT" ||
                          desc.includes("пополнение") ||
                          desc.includes("deposit") ||
                          desc.includes("received");
                          
                        const isWith =
                          (isSell && act.channelName === "WALLETHUB") ||
                          desc.includes("вывод") ||
                          desc.includes("withdrew") ||
                          desc.includes("withdrawal");

                        const isEx =
                          desc.includes("exchange") ||
                          desc.includes("обмен") ||
                          desc.includes("swap");

                        return { isDep, isWith, isEx, isBuy, isSell };
                      };

                      // Group activities by date
                      const groups: { [key: string]: typeof activity } = {};
                      activity.forEach((act) => {
                        const datePart = act.timestamp.split(" ")[0] || "2026-05-27";
                        if (!groups[datePart]) {
                          groups[datePart] = [];
                        }
                        groups[datePart].push(act);
                      });

                      // Sort dates descending
                      const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

                      if (activity.length === 0) {
                        return (
                          <div className="p-4 bg-[#1E1E1E] border border-white/5 rounded-2xl text-center font-sans text-[11px] text-neutral-500">
                            <p>{t("No transactions found.", "Транзакций не найдено.")}</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-5">
                          {sortedDates.map((dateStr) => {
                            // Format day label: e.g. "27 МАЯ 2026"
                            const parts = dateStr.split("-");
                            let displayDate = dateStr;
                            if (parts.length >= 3) {
                              const year = parts[0];
                              const monthIdx = parseInt(parts[1], 10) - 1;
                              const day = parseInt(parts[2], 10);
                              
                              const monthsRu = ["ЯНВАРЯ", "ФЕВРАЛЯ", "МАРТА", "АПРЕЛЯ", "МАЯ", "ИЮНЯ", "ИЮЛЯ", "АВГУСТА", "СЕНТЯБРЯ", "ОКТЯБРЯ", "НОЯБРЯ", "ДЕКАБРЯ"];
                              const monthsEn = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
                              
                              const mStr = language === "ru" ? monthsRu[monthIdx] : monthsEn[monthIdx];
                              displayDate = `${day} ${mStr} ${year}`;
                            }

                            return (
                              <div key={dateStr} className="space-y-2">
                                {/* DATE HEADER */}
                                <div className="text-[10px] font-sans font-extrabold text-neutral-500 tracking-wider uppercase px-1">
                                  {displayDate}
                                </div>

                                {/* GROUP BOX WITH GORGEOUS LAYOUT */}
                                <div className="bg-[#1E1E1E] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/[0.02]">
                                  {groups[dateStr].map((act) => {
                                    const timeParts = act.timestamp.split(" ");
                                    const timeStr = timeParts[1] || "";
                                    
                                    const { isDep, isWith, isEx, isBuy, isSell } = getTransactionInfo(act);
                                    
                                    let iconEl = null;
                                    let titleText = "";
                                    let subText = "";
                                    let amountText = "";
                                    let isPositive = false;

                                    if (isDep) {
                                      isPositive = true;
                                      titleText = language === "ru" ? "Пополнение" : "Deposit";
                                      subText = timeStr;
                                      
                                      // Plus sign in the square
                                      iconEl = (
                                        <span className="text-2xl font-bold text-[#00FF55] font-sans leading-none">+</span>
                                      );
                                      amountText = `+${formatNumber(act.amountTON, 2)} USDT`;
                                    } 
                                    else if (isWith) {
                                      isPositive = false;
                                      titleText = language === "ru" ? "Вывод" : "Withdrawal";
                                      subText = timeStr;
                                      
                                      // Upwards stick icon exactly like photo
                                      iconEl = (
                                        <ArrowUp className="w-5 h-5 text-neutral-200 stroke-[2.5px]" />
                                      );
                                      amountText = `-${formatNumber(act.amountTON, 2)} USDT`;
                                    }
                                    else if (isEx) {
                                      isPositive = act.amountTON >= 0;
                                      titleText = language === "ru" ? "Обмен" : "Exchange";
                                      subText = act.details.includes("→") ? act.details : "USDT → RUB";
                                      
                                      // Horizontal opposite arrows icon like photo
                                      iconEl = (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-200">
                                          <path d="M4 9H20M20 9L15 4M20 9L15 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                          <path d="M20 15H4M4 15L9 10M4 15L9 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                      );
                                      amountText = `${isPositive ? "+" : "-"}${formatNumber(Math.abs(act.amountTON), 2)} USDT`;
                                    }
                                    else {
                                      // Security / TDA Company stock deal
                                      titleText = act.channelName;
                                      const pcs = parseShares(act.details);
                                      const suffix = pcs ? ` • ${pcs}` : "";
                                      
                                      if (isBuy || act.type === "BUY") {
                                        isPositive = false;
                                        subText = (language === "ru" ? "Покупка" : "Purchase") + suffix;
                                        amountText = `-${formatNumber(act.amountTON, 2)} USDT`;
                                      } else if (isSell || act.type === "SELL") {
                                        isPositive = true;
                                        subText = (language === "ru" ? "Продажа" : "Sale") + suffix;
                                        amountText = `+${formatNumber(act.amountTON, 2)} USDT`;
                                      } else {
                                        isPositive = act.amountTON >= 0;
                                        subText = act.details;
                                        amountText = `${isPositive ? "+" : ""}${formatNumber(act.amountTON, 2)} USDT`;
                                      }

                                      // Look up channel custom picture/avatar
                                      const ch = channels.find(c => c.channelName === act.channelName || c.handle === act.channelName);
                                      if (ch && ch.avatarUrl) {
                                        iconEl = (
                                          <img
                                            src={ch.avatarUrl}
                                            className="w-10 h-10 object-cover rounded-xl"
                                            alt=""
                                            referrerPolicy="no-referrer"
                                          />
                                        );
                                      } else {
                                        // Standard circular TON-style coin outline vector for Stock Asset or standard initial letters
                                        const initials = act.channelName.substring(0, 2).trim().toUpperCase();
                                        iconEl = (
                                          <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/5 text-neutral-300 font-sans font-bold text-[11px] flex items-center justify-center">
                                            {initials}
                                          </div>
                                        );
                                      }
                                    }

                                    return (
                                      <div
                                        key={act.id}
                                        className="flex items-center justify-between p-3.5 hover:bg-white/[0.01] transition-all"
                                      >
                                        <div className="flex items-center gap-3">
                                          {/* SQUARE BLOCK WITH SLIGHTLY ROUNDED CORNERS */}
                                          <div className="w-11 h-11 bg-neutral-800/85 border border-white/5 rounded-2xl flex items-center justify-center shrink-0">
                                            {iconEl}
                                          </div>

                                          {/* LABELS */}
                                          <div className="space-y-0.5 text-left">
                                            <h4 className="font-sans font-semibold text-sm text-neutral-100 leading-tight">
                                              {titleText}
                                            </h4>
                                            <span className="text-xs font-sans text-neutral-500 block leading-tight">
                                              {subText}
                                            </span>
                                          </div>
                                        </div>

                                        {/* AMOUNT AND GREY POINTER CHEVRON */}
                                        <div className="flex items-center gap-1">
                                          <span className={`text-sm font-semibold font-sans tracking-tight drop-shadow-md ${
                                            isPositive ? "text-[#00FF55]" : "text-[#FF2A2A]"
                                          }`}>
                                            {amountText}
                                          </span>
                                          <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0" />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>
            )}

             {/* ----------------- TAB 3: PROFILE SCREEN & TDA WIZARD ----------------- */}
            {activeTab === "profile" && (
              <div id="profile-viewport" className="space-y-6 page-fade-enter">
                
                {/* 1. TOP HEADER WITH PROFILE DATA */}
                <div className="relative p-5 pb-8 bg-[#1E1E1E] border border-white/5 rounded-3xl flex flex-col mb-8">
                  {/* Top row */}
                  <div className="flex items-center gap-3">
                    {/* Square user avatar with rounded corners */}
                    <div className="relative w-[3.6rem] h-[3.6rem] rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-lg">
                      <Image
                        src={telegramUser?.photo_url || antaresAvatar}
                        alt="avatar"
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 ml-1">
                      {/* Username */}
                      <h3 className="font-sans font-extrabold text-[#ffffff] text-xl tracking-tight select-text leading-none mt-0.5">
                        {(telegramUser ? telegramUser.username : "antares").replace(/^@/, "")}
                      </h3>
                    </div>
                    
                    {/* Settings Trigger Icon (Gear) inside Profile box */}
                    <button
                      onClick={() => setActiveTab("settings")}
                      className="p-2 w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-neutral-400 hover:text-white transition-all focus:outline-none shrink-0"
                      title={t("Settings Panel", "Панель настроек")}
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>

                  {/* MAIN ACTIONS BLOCK - LAUNCH TDA */}
                  <div className="absolute left-6 right-6 -bottom-4">
                    <button
                      onClick={() => setActiveTab("tda")}
                      className="w-full h-8 hover:opacity-90 active:scale-[0.97] text-xs rounded-full font-sans font-bold flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer focus:outline-none shadow-[#0082c8]/20"
                      style={{ backgroundColor: '#0082c8', color: '#ffffff', border: 'none' }}
                    >
                      <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
                        <Plus className="w-3 h-3 stroke-[3]" style={{ color: '#0082c8' }} />
                      </div>
                      <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{t("Tokenize", "Токенизировать")}</span>
                    </button>
                  </div>
                </div>

                {bindAlertBanner && (
                  <div className="bg-cyan-950/25 border border-cyan-500/20 text-cyan-400 p-4 rounded-3xl flex items-center justify-between gap-3 text-left">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold tracking-widest uppercase block">{t("TELEGRAM COUPLING ENGAGED", "СОПРЯЖЕНИЕ С TELEGRAM ВКЛЮЧЕНО")}</span>
                      <p className="text-[11px] font-sans leading-normal text-cyan-200">
                        {language === "ru"
                          ? `Ваш Telegram-аккаунт @${telegramUser?.username || "tair_abdyukaev"} автоматически привязан при первом входе.`
                          : `Your Telegram account @${telegramUser?.username || "tair_abdyukaev"} was automatically linked instantly upon first sign-in.`}
                      </p>
                    </div>
                    <button
                      onClick={() => setBindAlertBanner(false)}
                      className="px-2.5 py-1 text-[9px] font-mono uppercase bg-cyan-950/50 border border-cyan-500/15 text-cyan-400 hover:bg-cyan-900/40 rounded-xl transition-all"
                    >
                      OK
                    </button>
                  </div>
                )}

                {/* 2. MY PUBLISHED ASSETS */}
                <div className="space-y-3">
                  <h2 className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">
                    {t("My Published Assets", "Мои выпущенные активы")}
                  </h2>
                  <div className="bg-[#1E1E1E] border border-white/5 rounded-3xl p-4 shadow-xl">
                    {(() => {
                      const myAssets = channels.filter(c => c.isCustomTDA);
                      if (myAssets.length === 0) {
                        return (
                          <div className="text-center font-sans text-[11px] text-neutral-500 py-6 space-y-1.5 flex flex-col items-center">
                            <Briefcase className="w-8 h-8 text-neutral-600 mb-2 opacity-50" />
                            <p>{t("No published assets yet.", "У вас пока нет выпущенных активов.")}</p>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3">
                          {myAssets.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-3 bg-black/20 rounded-2xl border border-white/5 hover:bg-white/[0.02] cursor-pointer" onClick={() => setStagedChannel(c)}>
                              <div className="flex items-center gap-3">
                                {c.avatarUrl ? (
                                  <img src={c.avatarUrl} className="w-10 h-10 object-cover rounded-xl border border-white/10 shrink-0" alt="" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-[#232323] border border-white/10 flex items-center justify-center shrink-0">
                                    <span className="font-mono text-neutral-300 text-sm font-bold uppercase">{c.channelName.substring(0,1)}</span>
                                  </div>
                                )}
                                <div className="space-y-0.5">
                                  <h3 className="font-sans font-bold text-[13px] text-white leading-none">{c.channelName}</h3>
                                  <span className="font-mono text-[10px] text-neutral-500 block">@{c.handle}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono text-[12px] font-bold text-sky-400 block">{formatNumber(c.sharePrice, 4)} USDT</span>
                                <span className="font-sans text-[10px] text-neutral-400 block">{t("Cap:", "Кап:")} ${formatNumber(c.valuation, 0)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 3. MY TDA APPLICATIONS */}
                <div className="space-y-3">
                  <h2 className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">
                    {t("TWA Applications", "Мои заявки на TWA")}
                  </h2>
                  <div className="bg-[#1E1E1E] border border-white/5 rounded-3xl p-4 shadow-xl">
                    {tdaRequests.length === 0 ? (
                      <div className="text-center font-sans text-[11px] text-neutral-500 py-6 space-y-1.5 flex flex-col items-center">
                        <FileText className="w-8 h-8 text-neutral-600 mb-2 opacity-50" />
                        <p>{t("No TWA applications found.", "У вас пока нет активных заявок на TWA.")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tdaRequests.map(req => (
                          <div key={req.id} className="p-3 bg-black/20 rounded-2xl border border-white/5 space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-sans font-bold text-[13px] text-white leading-none">{req.channelName}</h3>
                                <span className="font-mono text-[10px] text-neutral-500 block mt-1">{req.channelHandle}</span>
                              </div>
                              <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider ${
                                req.stage === 'Approved' || req.stage === 'Listed' || req.stage === 'Scheduled' ? 'bg-green-500/20 text-green-400 border border-green-500/20' :
                                req.stage === 'Rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                                'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                              }`}>
                                {req.stage === 'Verification' ? t('Verification', 'На модерации') :
                                 req.stage === 'Scheduled' ? t('Scheduled', 'Одобрено') :
                                 req.stage === 'Rejected' ? t('Rejected', 'Отклонено') : req.stage}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] mt-1 pt-2 border-t border-white/[0.05]">
                               <span className="font-mono text-neutral-400">{t("Subs: ", "Подписчиков: ")} {formatNumber(req.subscribers)}</span>
                               <span className="font-mono text-neutral-500">{req.submissionDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6 page-fade-enter">
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 w-fit focus:outline-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{t("BACK TO PROFILE", "НАЗАД В ПРОФИЛЬ")}</span>
                </button>

                <div className="bg-[#1E1E1E] border border-white/5 rounded-3xl p-6 space-y-6">
                  <div>
                    <h2 className="text-base font-sans font-extrabold text-white tracking-tight flex items-center gap-2">
                      <Settings className="w-5 h-5 text-[#26A17B]" />
                      {t("SETTINGS", "НАСТРОЙКИ")}
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">
                      {t("Configure your language and system state reset options.", "Настройки языка платформы и управление балансами.")}
                    </p>
                  </div>

                  {/* SELECT LANGUAGE */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block font-bold">
                      {t("SELECT LANGUAGE", "ВЫБОР ЯЗЫКА")}
                    </span>
                    <div className="grid grid-cols-2 gap-2 bg-[#121212] p-1.5 rounded-xl border border-white/5 font-mono text-xs">
                      <button
                        onClick={() => changeLanguage("en")}
                        className={`py-2 rounded-lg transition-all focus:outline-none cursor-pointer ${
                          language === "en" ? "bg-white text-black font-semibold" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        ENGLISH
                      </button>
                      <button
                        onClick={() => changeLanguage("ru")}
                        className={`py-2 rounded-lg transition-all focus:outline-none cursor-pointer ${
                          language === "ru" ? "bg-white text-black font-semibold" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        РУССКИЙ
                      </button>
                    </div>
                  </div>

                  {/* RESET AND FAUCET */}
                  <div className="space-y-2 border-t border-white/5 pt-4">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase block tracking-wider font-bold">
                      {t("PLATFORM UTILITIES", "СЛУЖЕБНЫЕ ИНСТРУМЕНТЫ")}
                    </span>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs font-bold">
                      <button
                        onClick={() => {
                          setTonBalance(0.0);
                          setHoldings([]);
                          setActivity([]);
                          setChannels([]);
                          setTdaRequests([]);
                          setNotifications([]);
                          setStagedChannel(null);
                          setShowTdaWizard(false);
                          alert(t("All state data has been fully wiped and reset!", "Все данные на платформе (включая листинг, портфель и баланс) полностью удалены!"));
                        }}
                        className="py-2.5 rounded-xl text-center uppercase border border-white/10 bg-white/5 text-neutral-400 hover:text-white transition-all cursor-pointer focus:outline-none"
                      >
                        {t("RESET STATE", "СБРОСИТЬ ВСЕ")}
                      </button>
                      </div>
                    </div>
                  </div>
              </div>
            )}

            {activeTab === "tda" && (
              <div className="space-y-6 page-fade-enter">
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 w-fit focus:outline-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{t("BACK TO PROFILE", "НАЗАД В ПРОФИЛЬ")}</span>
                </button>

                <div className="space-y-4">
                    <div className="p-5 bg-[#1E1E1E] border border-white/5 rounded-3xl space-y-4">
                      {/* New Moderation Request Form directly */}
                      <form onSubmit={handleSubmitTDARequest} className="space-y-4 text-left">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                          <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-white">
                            {t("NEW ACCOUNT AUDIT REQUEST", "ЗАЯВКА НА МОДЕРАЦИЮ И БИРЖУ TWA")}
                          </h3>
                          <span className="text-[7px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase font-black">
                            {t("Awaiting audit", "Верификация ИИ & Ручная")}
                          </span>
                        </div>

                        {appSubmissionStatus === "success" ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-6 space-y-3"
                          >
                            <div className="w-12 h-12 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center justify-center mx-auto">
                              <Check className="w-6 h-6" />
                            </div>
                            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">
                              {t("Application Transmitted!", "Заявка успешно отправлена!")}
                            </h4>
                            <p className="text-[10px] font-mono text-neutral-400 leading-relaxed max-w-sm mx-auto">
                              {t(
                                "Your statistics have been submitted to the chief administrator. We'll verify ad revenue receipts and subscriber quality ratios. Monitor the progress status live below.",
                                "Ваша заявка направлена главному администратору проекта. Качество подписчиков и доходность будут верифицированы ИИ на сетевом уровне. Статус отображается в списке ваших заявок ниже."
                              )}
                            </p>
                            <button
                              type="button"
                              onClick={() => setAppSubmissionStatus("idle")}
                              className="mt-2 text-[10px] font-semibold font-mono text-white bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl transition-all uppercase"
                            >
                              {t("Submit another channel", "Добавить еще один канал")}
                            </button>
                          </motion.div>
                        ) : (
                          <div className="space-y-3">
                            {/* Channel Name */}
                            <div className="space-y-1">
                              <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">{t("Channel Name", "Название Телеграм-канала")} *</label>
                              <input
                                type="text"
                                required
                                value={submitTdaName}
                                onChange={(e) => setSubmitTdaName(e.target.value)}
                                placeholder={t("e.g. Durov's Tech Channel", "Например: Канал Олега Бизнес")}
                                className="w-full bg-[#18181c] border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-neutral-600"
                              />
                            </div>

                            {/* Channel Link / Handle */}
                            <div className="space-y-1">
                              <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">{t("Channel Username / Link", "Юзернейм или ссылка на канал")} *</label>
                              <input
                                type="text"
                                required
                                value={submitTdaHandle}
                                onChange={(e) => setSubmitTdaHandle(e.target.value)}
                                placeholder="e.g. @durov_news_daily"
                                className="w-full bg-[#18181c] border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-neutral-600"
                              />
                            </div>

                            {/* Subscribers & Monthly Views */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">{t("SubscribersCount", "Кол-во Подписчиков")} *</label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  value={submitTdaSubscribers}
                                  onChange={(e) => setSubmitTdaSubscribers(e.target.value)}
                                  placeholder="e.g. 54000"
                                  className="w-full bg-[#18181c] border border-white/5 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-neutral-600"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">{t("Monthly Post Views", "Просмотры в месяц")} *</label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  value={submitTdaViews}
                                  onChange={(e) => setSubmitTdaViews(e.target.value)}
                                  placeholder="e.g. 120000"
                                  className="w-full bg-[#18181c] border border-white/5 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-neutral-600"
                                />
                              </div>
                            </div>

                            {/* Revenue & Channel Age */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">{t("Monthly Ad Revenue (USD)", "Доход в месяц ($)")} *</label>
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  value={submitTdaRevenue}
                                  onChange={(e) => setSubmitTdaRevenue(e.target.value)}
                                  placeholder="e.g. 1500"
                                  className="w-full bg-[#18181c] border border-white/5 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-neutral-600"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">{t("Channel Age (Years)", "Сколько лет каналу")}</label>
                                <select
                                  value={submitTdaAge}
                                  onChange={(e) => setSubmitTdaAge(e.target.value)}
                                  className="w-full bg-[#18181c] border border-white/5 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white/20 transition-all"
                                >
                                  <option value="0.5">{t("< 1 Year", "Меньше 1 года")}</option>
                                  <option value="1">1 {t("Year", "Год")}</option>
                                  <option value="2">2 {t("Years", "Года")}</option>
                                  <option value="3">3 {t("Years", "Года")}</option>
                                  <option value="5">5+ {t("Years", "5+ лет")}</option>
                                </select>
                              </div>
                            </div>

                            {/* Statistics detailed narrative */}
                            <div className="space-y-1">
                              <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest block">{t("Additional statistics & notes", "Аналитика и общая статистика")}</label>
                              <textarea
                                value={submitTdaStats}
                                onChange={(e) => setSubmitTdaStats(e.target.value)}
                                placeholder={t("Paste direct links to TGStat/Telemetr or write engagement metrics details here...", "Укажите ссылки на TGStat/Telemetr или опишите показатели вовлеченности...")}
                                className="w-full bg-[#18181c] border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none h-16 focus:border-white/20 transition-all placeholder:text-neutral-700 resize-none"
                              />
                            </div>

                            {/* Proofs file upload container */}
                            <div className="space-y-1.5">
                              <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest block">
                                {t("Verification Proofs (Photo / PDF)", "Доказательства владения и доходов (Фото / PDF)")}
                              </label>
                              
                              <div className="border border-dashed border-white/10 rounded-2xl p-4 text-center bg-black/10 hover:bg-black/25 hover:border-white/20 transition-all cursor-pointer relative">
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={handleFileChange}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                />
                                <UploadCloud className="w-6 h-6 text-neutral-500 mx-auto mb-1.5" />
                                <p className="text-[10px] font-sans text-white font-medium">
                                  {t("Drag or click to attach proof document", "Нажмите для загрузки скриншотов кабинета")}
                                </p>
                                <p className="text-[8px] font-mono text-neutral-500 mt-1 uppercase">
                                  PNG, JPG, PDF (MAX 5MB)
                                </p>
                              </div>

                              {/* Active chosen file preview card */}
                              {uploadedFileName && (
                                <motion.div
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {fileIsPdf ? (
                                      <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-mono font-black text-[9px] border border-red-500/20 shrink-0">
                                        PDF
                                      </div>
                                    ) : (
                                      uploadedFileBase64 ? (
                                        <img
                                          src={uploadedFileBase64}
                                          alt="Preview"
                                          className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-mono font-black text-[9px] border border-blue-500/20 shrink-0">
                                          IMG
                                        </div>
                                      )
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-[10px] text-white font-medium truncate max-w-[150px]">{uploadedFileName}</p>
                                      <span className="text-[8px] font-mono text-neutral-500 block leading-none">{uploadedFileSize}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUploadedFileName("");
                                      setUploadedFileSize("");
                                      setUploadedFileBase64("");
                                      setFileIsPdf(false);
                                    }}
                                    className="p-1 hover:bg-white/5 rounded-lg text-neutral-400 hover:text-white transition-all text-xs"
                                  >
                                    <Trash className="w-3.5 h-3.5 text-neutral-400" />
                                  </button>
                                </motion.div>
                              )}
                            </div>

                            {/* Submit button */}
                            <button
                              type="submit"
                              disabled={appSubmissionStatus === "submitting"}
                              className="w-full mt-3 hover:opacity-90 disabled:bg-neutral-800 disabled:text-neutral-500 font-bold text-xs py-2.5 uppercase rounded-xl tracking-wider transition-all"
                              style={{ backgroundColor: '#FFFFFF', color: '#000000', border: 'none' }}
                            >
                              {appSubmissionStatus === "submitting" 
                                ? t("TRANSMITTING TO MAIN ADMIN...", "ОТПРАВКА НА МОДЕРАЦИЮ...") 
                                : t("SUBMIT APPLICATION", "ОТПРАВИТЬ ЗАЯВКУ НА TDA")}
                            </button>
                          </div>
                        )}
                      </form>
                    </div>
                  </div>



                {/* 4. TDA REQUESTS SECTION */}
                <div className="space-y-3">
                  <h2 className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">
                    {t("TWA Requests", "Заявки на TDA")}
                  </h2>

                  <div className="gap-3 flex flex-col">
                    {tdaRequests.length === 0 ? (
                      <div className="p-5 text-center border border-white/5 bg-[#1E1E1E] rounded-3xl text-xs font-mono text-neutral-500">
                        {t("No applications found. Submit one above!", "Заявок пока нет. Отправьте заявку выше!")}
                      </div>
                    ) : (
                      tdaRequests.map((req, i) => {
                        const isRejected = req.stage === "Rejected";
                        const isScheduled = req.stage === "Approved" || req.stage === "Scheduled";
                        const isVerification = req.stage === "Verification";

                        let stageLabel = req.stage;
                        if (isVerification) stageLabel = t("Reviewing", "На модерации");
                        if (isScheduled) stageLabel = t("Approved", "Одобрена");
                        if (isRejected) stageLabel = t("Rejected", "Отклонена");

                        let cardBorder = "border-white/5 bg-[#1E1E1E]";
                        if (isRejected) cardBorder = "border-red-900/30 bg-[#251a1a]/40";
                        if (isScheduled) cardBorder = "border-green-900/40 bg-[#1a251a]/40";

                        return (
                          <div
                            key={req.id || i}
                            className={`p-4 rounded-3xl border text-left flex flex-col gap-3 relative overflow-hidden ${cardBorder}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-sans font-bold text-xs text-white">{req.channelName}</h4>
                                <span className="text-[9px] font-mono text-neutral-500 block truncate">{req.channelHandle}</span>
                              </div>
                              <span className={`text-[8px] font-mono font-bold tracking-wider px-2 py-0.5 rounded border uppercase ${
                                isRejected
                                  ? "border-red-500/30 text-red-400 bg-red-950/20"
                                  : isScheduled
                                  ? "border-green-500/30 text-green-400 bg-green-950/20"
                                  : "border-amber-500/30 text-amber-400 bg-amber-950/20"
                              }`}>
                                {stageLabel}
                              </span>
                            </div>

                            {/* Review attributes */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-neutral-400 font-semibold">
                              <div>
                                <span className="text-[8px] text-neutral-500 block uppercase font-bold">{t("EST. TWA DATE", "ДАТА ПРОВЕДЕНИЯ")}</span>
                                <span className="text-white mt-0.5 block">{req.date}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-neutral-500 block uppercase font-bold">{t("VERIFICATION PROGRESS", "ПРОГРЕСС ПРОВЕРКИ")}</span>
                                <span className="text-white mt-0.5 block">{req.progress}</span>
                              </div>
                            </div>

                            {/* Stats summary preview */}
                            <div className="bg-black/20 p-2 rounded-xl border border-white/5 grid grid-cols-3 gap-1 text-center text-[9px] font-mono">
                              <div>
                                <span className="text-neutral-500 uppercase block text-[7px] font-bold">{t("SUBS", "ПОДП.")}</span>
                                <span className="text-white font-semibold">{formatNumber(req.subscribers)}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 uppercase block text-[7px] font-bold">{t("REV MoM", "ДОХОД")}</span>
                                <span className="text-white font-semibold">${formatNumber(req.monthlyRevenue)}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 uppercase block text-[7px] font-bold">{t("AGE", "ВОЗРАСТ")}</span>
                                <span className="text-white font-semibold">{req.channelAge} {t("yrs", "лет")}</span>
                              </div>
                            </div>

                            {req.rejectionReason && (
                              <div className="border-t border-red-500/10 pt-2 text-[9px] text-red-300 font-mono italic leading-relaxed">
                                <strong>{t("Reason:", "Причина:")}</strong> {req.rejectionReason}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>



              </div>
            )}

            {activeTab === "contracts" && (
              <div className="space-y-6 page-fade-enter">
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 w-fit"
                >
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>EXIT DIAGNOSTICS</span>
                </button>
                <ContractsTab />
              </div>
            )}

            {activeTab === "admin" && (
              !isAdminAuthenticated ? (
                /* HIGH FIDELITY SECURITY PASSCODE KEYPAD LOCKSCREEN */
                <div id="admin-pin-lockscreen" className="flex flex-col items-center justify-center py-10 w-full max-w-sm mx-auto space-y-6 page-fade-enter bg-[#1E1E1E] border border-white/5 rounded-3xl p-6 shadow-2xl">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto shadow-lg shadow-red-500/5 animate-pulse mb-2">
                      <Lock className="w-6 h-6 text-red-500" />
                    </div>
                    <h2 className="text-sm font-mono font-extrabold text-white tracking-widest uppercase">
                      {t("SECURE GATEWAY LOCK", "ЗАЩИЩЕННЫЙ ШЛЮЗ")}
                    </h2>
                    <p className="text-[10px] text-neutral-400 max-w-xs leading-normal">
                      {t("Enter 4-digit administrative PIN to access databases, transaction limits, and deployment mainframes.", "Введите 4-значный PIN-код администратора для работы с базами данных и смарт-контрактами.")}
                    </p>
                  </div>

                  {/* Dots indicator */}
                  <div className="flex items-center justify-center gap-4 py-2">
                    {[1, 2, 3, 4].map((index) => {
                      const isActive = adminPasscode.length >= index;
                      return (
                        <div
                          key={index}
                          className={`w-3.5 h-3.5 rounded-full border transition-all duration-300 ${
                            passcodeError
                              ? "bg-red-500 border-red-500 scale-100"
                              : isActive
                              ? "bg-sky-400 border-sky-400 shadow-md shadow-sky-500/30 scale-110"
                              : "bg-[#141416] border-white/10"
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Tiny Hint Badge */}
                  <div className="text-[9px] font-mono bg-[#141416] border border-white/5 text-neutral-400 px-3 py-1 rounded-full text-center">
                    🔑 {t("Hint Passcode: 2026 or 7777", "Мастер-пароль: 2026 или 7777")}
                  </div>

                  {/* Custom Tactile Keyboard Grid */}
                  <div className="grid grid-cols-3 gap-2.5 w-full select-none">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handlePINInput(num.toString())}
                        className="h-12 rounded-xl bg-[#1d1d22] hover:bg-[#25252b] active:scale-95 border border-white/5 text-white font-sans text-base font-bold flex items-center justify-center transition-all cursor-pointer shadow-sm focus:outline-none"
                      >
                        {num}
                      </button>
                    ))}
                    {/* Clear */}
                    <button
                      type="button"
                      onClick={() => setAdminPasscode("")}
                      className="h-12 rounded-xl bg-white/[0.02] hover:bg-white/5 active:scale-95 border border-transparent text-neutral-500 hover:text-neutral-300 font-sans text-[10px] font-bold uppercase flex items-center justify-center transition-all cursor-pointer focus:outline-none"
                    >
                      {t("RESET", "СБРОС")}
                    </button>
                    {/* Number 0 */}
                    <button
                      type="button"
                      onClick={() => handlePINInput("0")}
                      className="h-12 rounded-xl bg-[#1d1d22] hover:bg-[#25252b] active:scale-95 border border-white/5 text-white font-sans text-base font-bold flex items-center justify-center transition-all cursor-pointer shadow-sm focus:outline-none"
                    >
                      0
                    </button>
                    {/* Backspace icon button */}
                    <button
                      type="button"
                      onClick={() => setAdminPasscode((prev) => prev.slice(0, -1))}
                      className="h-12 rounded-xl bg-white/[0.02] hover:bg-white/5 active:scale-95 border border-transparent text-neutral-500 hover:text-neutral-300 flex items-center justify-center transition-all cursor-pointer focus:outline-none"
                    >
                      <X className="w-4 h-4 text-neutral-400" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 page-fade-enter">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-mono font-bold tracking-wider text-neutral-400 uppercase">
                      {t("CHIEF MODERATOR PANEL", "ПАНЕЛЬ ГЛАВНОГО АДМИНИСТРАТОРА")}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-green-500/30 text-green-400 bg-green-950/20 uppercase font-bold tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                      {t("ONLINE", "АКТИВЕН")}
                    </span>
                  </div>

                  {/* KPI/Stats counters */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-[#1E1E1E] border border-white/5 p-4 rounded-3xl">
                      <span className="text-[9px] font-mono text-neutral-500 block uppercase font-bold">{t("PENDING AUDITS", "ОЖИДАЮТ ПРОВЕРКИ")}</span>
                      <span className="text-xl font-bold text-white mt-1 block">
                        {tdaRequests.filter((r) => r.stage === "Verification").length}
                      </span>
                    </div>
                    <div className="bg-[#1E1E1E] border border-white/5 p-4 rounded-3xl">
                      <span className="text-[9px] font-mono text-neutral-500 block uppercase font-bold">{t("LIVE TRADING BOARD", "АКТИВНЫХ ЛИСТИНГОВ")}</span>
                      <span className="text-xl font-bold text-white mt-1 block">
                        {channels.length}
                      </span>
                    </div>
                    <div className="bg-[#1E1E1E] border border-white/5 p-4 rounded-3xl">
                      <span className="text-[9px] font-mono text-neutral-500 block uppercase font-bold">{t("VESTED CONTRACTS", "БЛОКИРОВАНО СРЕДСТВ")}</span>
                      <span className="text-xl font-bold text-white mt-1 block font-mono text-[#26A17B]">
                        1.2M <span className="text-xs">USDT</span>
                      </span>
                    </div>
                    <div className="bg-[#1E1E1E] border border-white/5 p-4 rounded-3xl">
                      <span className="text-[9px] font-mono text-neutral-500 block uppercase font-bold">{t("ORACLE SYNC", "СТАТУС СЕТИ")}</span>
                      <span className="text-xl font-bold text-white mt-1 block text-green-400 flex items-center gap-1">
                        100% <span className="text-[9.5px] font-mono text-green-500">SYNC</span>
                      </span>
                    </div>
                  </div>

                  {/* Role playing active session status */}
                  <div className="bg-[#141416] border border-white/5 rounded-3xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[8px] font-mono text-neutral-500 block uppercase font-bold tracking-widest">{t("OPERATOR WORKSPACE PRIVILEGES", "ТЕКУЩИЕ ПРАВА ДОСТУПА")}</span>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                        <Shield className={`w-3.5 h-3.5 ${
                          adminRole === "super_admin" ? "text-red-500" :
                          adminRole === "risk_analyst" ? "text-amber-500" :
                          adminRole === "moderator" ? "text-green-500" : "text-blue-500"
                        }`} />
                        {adminRole.toUpperCase()}
                      </span>
                      <div className="text-[9.5px] font-sans text-neutral-400 leading-normal max-w-xl">
                        {adminRole === "super_admin" && t("Permissions: Read/Write, adjust roles, ban users, modify balances, override risk policies.", "Разрешения: Полный доступ, редактирование ролей, баны, изменение балансов, обход политик риска.")}
                        {adminRole === "risk_analyst" && t("Permissions: Adjust policies & limits, halt trading, apply freezes, ban accounts (read-only in listings).", "Разрешения: Настройка ограничений, заморозка торгов, баны учетных записей (только просмотр заявок).")}
                        {adminRole === "moderator" && t("Permissions: Approve/reject listings, verify audits, compile Acton contracts (read-only in database/policies).", "Разрешения: Проверка и одобрение листингов, деплой смарт-контрактов (только просмотр баз данных).")}
                        {adminRole === "financial_auditor" && t("Permissions: Adjust channel passive APY yields, modify balances, view query activity logs.", "Разрешения: Изменение доходности APY, регулирование балансов, просмотр финансовых логов.")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminSubTab("safety");
                        alert(language === "ru" ? "Используйте селектор роли внизу страницы" : "Please use the workspace role selector below");
                      }}
                      className="text-[9.5px] font-mono font-bold tracking-wider uppercase bg-[#1d1d22] hover:bg-[#23232a] border border-white/10 text-white px-3 py-1.5 rounded-xl transition-all self-stretch md:self-auto text-center cursor-pointer focus:outline-none"
                    >
                      ⚡ {t("SWITCH RIGHT", "СМЕНИТЬ ПРАВА")}
                    </button>
                  </div>

                  {/* Sub tab navigation */}
                  <div className="flex bg-[#141416] p-1 rounded-2xl border border-white/5 gap-1 overflow-x-auto scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setAdminSubTab("applications")}
                      className={`flex-1 py-1.5 px-3 text-xs font-mono font-semibold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap cursor-pointer focus:outline-none ${
                        adminSubTab === "applications"
                          ? "bg-[#232323] text-white border border-white/5"
                          : "text-neutral-500 hover:text-[#0082c8]"
                      }`}
                    >
                      🚀 {t("Applications", "Заявки на TDA")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminSubTab("database")}
                      className={`flex-1 py-1.5 px-3 text-xs font-mono font-semibold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap cursor-pointer focus:outline-none ${
                        adminSubTab === "database"
                          ? "bg-[#232323] text-white border border-white/5"
                          : "text-neutral-500 hover:text-[#0082c8]"
                      }`}
                    >
                      🗄️ {t("System Database", "База данных")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminSubTab("minting")}
                      className={`flex-1 py-1.5 px-3 text-xs font-mono font-semibold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap cursor-pointer focus:outline-none ${
                        adminSubTab === "minting"
                          ? "bg-[#232323] text-white border border-white/5"
                          : "text-neutral-500 hover:text-[#0082c8]"
                      }`}
                    >
                      🪙 {t("Mint & Airdrop", "Выпуск & Раздачи")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminSubTab("news")}
                      className={`flex-1 py-1.5 px-3 text-xs font-mono font-semibold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap cursor-pointer focus:outline-none ${
                        adminSubTab === "news"
                          ? "bg-[#232323] text-white border border-white/5"
                          : "text-neutral-500 hover:text-[#0082c8]"
                      }`}
                    >
                      📰 {t("News Management", "Управление Новости")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminSubTab("safety")}
                      className={`flex-1 py-1.5 px-3 text-xs font-mono font-semibold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap cursor-pointer focus:outline-none ${
                        adminSubTab === "safety"
                          ? "bg-[#232323] text-white border border-white/5"
                          : "text-neutral-500 hover:text-[#0082c8]"
                      }`}
                    >
                      🛡️ {t("Policy & Limits", "Политики & Лимиты")}
                    </button>
                  </div>

                {/* Queue list */}
                {adminSubTab === "applications" && (
                  <div className="space-y-4">
                    {adminRole !== "super_admin" && adminRole !== "moderator" && (
                      <div className="p-3 bg-amber-950/15 border border-amber-500/10 text-[10.5px] text-amber-400 rounded-2xl text-left">
                        ⚠️ {t("Role Constraint: Your current operator role does not have authorization to compile/deploy Acton contracts. Toggle status to SUPER_ADMIN or MODERATOR in Safety panel to approve listings.", "Ограничение роли: Текущие права вашей сессии недоступны для компиляции и деплоя контрактов. Переключите статус на SUPER_ADMIN или MODERATOR.")}
                      </div>
                    )}
                    <h3 className="text-[11px] font-mono font-bold tracking-wider text-neutral-400 uppercase text-left">
                      {t("LISTING APPLICATIONS PIPELINE", "ОЧЕРЕДЬ ЗАЯВОК НА ПРОВЕРКУ")}
                    </h3>

                  <div className="space-y-4">
                    {tdaRequests.length === 0 ? (
                      <div className="p-10 text-center border border-white/5 bg-[#1E1E1E] rounded-3xl text-xs font-mono text-neutral-500">
                        {t("No applications in pipeline.", "В очереди нет ни одной заявки.")}
                      </div>
                    ) : (
                      tdaRequests.map((req) => {
                        const isPending = req.stage === "Verification";
                        const isRejected = req.stage === "Rejected";
                        const isScheduled = req.stage === "Scheduled" || req.stage === "Approved";

                        let stageBadgeColor = "border-amber-500/30 text-amber-400 bg-amber-950/20";
                        if (isRejected) stageBadgeColor = "border-red-500/30 text-red-400 bg-red-950/20";
                        if (isScheduled) stageBadgeColor = "border-green-500/30 text-green-400 bg-green-950/20";

                        return (
                          <div
                            key={req.id}
                            className={`p-5 rounded-3xl border text-left flex flex-col gap-4 relative overflow-hidden bg-[#1E1E1E] ${
                              isPending ? "border-amber-500/20" : isRejected ? "border-red-500/10" : "border-green-500/10"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <h4 className="font-sans font-bold text-sm text-white shrink-0">{req.channelName}</h4>
                                <span className="text-[10px] font-mono text-neutral-500 block truncate mt-0.5">{req.channelHandle}</span>
                              </div>
                              <span className={`text-[8px] font-mono font-bold tracking-wider px-2 py-0.5 rounded border uppercase ${stageBadgeColor}`}>
                                {isPending ? t("UNDER AUDIT", "НА РАССМОТРЕНИИ") :
                                 isRejected ? t("REJECTED", "ОТКЛОНЕНА") :
                                 t("APPROVED & LIVE", "ОДОБРЕНА И ЗАПУЩЕНА")}
                              </span>
                            </div>

                            {/* Detailed specifications */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 bg-black/20 p-3 rounded-2xl border border-white/5 text-[10px] font-mono">
                              <div>
                                <span className="text-neutral-500 block uppercase font-bold text-[7.5px]">{t("SUBSCRIBERS", "ПОДПИСЧИКИ")}</span>
                                <span className="text-white font-semibold mt-0.5 block">{formatNumber(req.subscribers)}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block uppercase font-bold text-[7.5px]">{t("MONTHLY VIEWS", "ПРОСМОТРЫ В МЕСЯЦ")}</span>
                                <span className="text-white font-semibold mt-0.5 block">{formatNumber(req.monthlyViews)}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block uppercase font-bold text-[7.5px]">{t("EST. MONTHLY REV", "ДОХОД В МЕСЯЦ")}</span>
                                <span className="text-white font-semibold mt-0.5 block text-green-400">${formatNumber(req.monthlyRevenue)}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block uppercase font-bold text-[7.5px]">{t("CHANNEL AGE", "ВОЗРАСТ КАНАЛА")}</span>
                                <span className="text-white font-semibold mt-0.5 block">{req.channelAge} {t("yrs", "лет")}</span>
                              </div>
                            </div>

                            {req.additionalStats && (
                              <div className="text-[11px] text-neutral-300 font-sans leading-relaxed border-l-2 border-white/10 pl-3.5">
                                <span className="font-mono text-[9px] text-neutral-500 block uppercase font-bold leading-none mb-1">{t("ADDITIONAL DETAILS", "ДОПОЛНИТЕЛЬНО")}</span>
                                {req.additionalStats}
                              </div>
                            )}

                            {/* Verification file attachment if present */}
                            {req.proofFileName && (
                              <div className="bg-[#232323] p-3 rounded-2xl border border-white/5 flex flex-col gap-2">
                                <div className="flex items-center justify-between text-xs font-mono">
                                  <div className="flex items-center gap-2 text-neutral-300">
                                    <FileText className="w-4 h-4 text-sky-400" />
                                    <span className="truncate max-w-[180px] font-bold">{req.proofFileName}</span>
                                    {req.proofFileSize && <span className="text-[9px] text-neutral-500">({req.proofFileSize})</span>}
                                  </div>

                                  {req.proofFileBase64 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedProofId(expandedProofId === req.id ? null : req.id);
                                      }}
                                      className="text-[9px] font-mono text-sky-400 hover:text-sky-300 font-bold underline"
                                    >
                                      {expandedProofId === req.id ? t("Hide Document", "Скрыть документ") : t("View Document", "Показать документ")}
                                    </button>
                                  )}
                                </div>

                                {/* Render Attachment Preview dynamically if base64 exists */}
                                {expandedProofId === req.id && req.proofFileBase64 && (
                                  <div className="mt-2 pt-2 border-t border-white/5 flex flex-col items-center">
                                    {req.proofFileBase64.startsWith("data:image/") ? (
                                      <div className="relative w-full max-h-[300px] overflow-hidden rounded-xl border border-white/10 flex justify-center bg-black/40">
                                        <img
                                          src={req.proofFileBase64}
                                          alt="Invoice Verification Ledger Proof"
                                          className="max-h-[300px] object-contain rounded-xl"
                                        />
                                      </div>
                                    ) : (
                                      <div className="p-4 bg-black/30 rounded-xl w-full border border-white/5 text-center font-mono text-[10px] text-sky-400">
                                        {t("PDF/Binary secure payload previewed on-chain", "PDF/Бинарный файл верифицирован в блокчейне")}
                                        <a href={req.proofFileBase64} download={req.proofFileName} className="block mt-2 font-bold hover:underline underline">
                                          {t("Download raw contract payload", "Скачать исходный документ")}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Rejection comment if exists */}
                            {req.rejectionReason && (
                              <div className="p-3 bg-red-900/10 border border-red-500/10 rounded-2xl text-[10.5px] text-red-300 font-mono italic leading-normal">
                                <strong>{t("Rejection Reason:", "Причина отклонения:")}</strong> {req.rejectionReason}
                              </div>
                            )}

                            {/* Action state rendering */}
                            {isPending && (
                              <div className="border-t border-white/5 pt-4">
                                {adminDeployingReqId === req.id ? (
                                  <div className="space-y-4 bg-black/30 p-4 rounded-2xl border border-sky-500/10 text-left page-fade-enter">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                      <h4 className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                                        {t("ACTON SMART CONTRACT BUILDER (USDT)", "КОНФИГУРАЦИЯ ВЫПУСКА В ACTON (USDT)")}
                                      </h4>
                                      <span className="text-[9px] font-mono text-neutral-400 font-bold">v1.4.2 PRO</span>
                                    </div>

                                    {/* Configuration Inputs */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-mono uppercase text-neutral-400 block font-bold">
                                          {t("TOTAL SHARES TO ISSUE", "КОЛИЧЕСТВО АКЦИЙ К ВЫПУСКУ")}
                                        </label>
                                        <input
                                          type="number"
                                          disabled={isCompilingActon}
                                          value={adminSharesSupply}
                                          onChange={(e) => setAdminSharesSupply(Math.max(1000, parseInt(e.target.value) || 0))}
                                          className="w-full text-xs font-mono bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500/50 disabled:opacity-50"
                                        />
                                        <span className="text-[8px] font-mono text-neutral-500">{t("Min: 1,000 shares", "Мин: 1,000 акций")}</span>
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[9px] font-mono uppercase text-neutral-400 block font-bold">
                                          {t("TWA SHARE PRICE (USDT)", "ЦЕНА ОДНОЙ АКЦИИ (USDT)")}
                                        </label>
                                        <input
                                          type="number"
                                          step="0.001"
                                          disabled={isCompilingActon}
                                          value={adminSharePrice}
                                          onChange={(e) => setAdminSharePrice(Math.max(0.0001, parseFloat(e.target.value) || 0))}
                                          className="w-full text-xs font-mono bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500/50 disabled:opacity-50"
                                        />
                                        <span className="text-[8px] font-mono text-neutral-500">{t("Min: 0.0001 USDT", "Мин: 0.0001 USDT")}</span>
                                      </div>

                                      <div className="space-y-1 md:col-span-2 text-left">
                                        <label className="text-[9px] font-mono uppercase text-neutral-400 block font-bold">
                                          {t("TWA DURATION", "ДЛИТЕЛЬНОСТЬ TWA")}
                                        </label>
                                        <select
                                          disabled={isCompilingActon}
                                          value={adminDurationHours}
                                          onChange={(e) => setAdminDurationHours(parseInt(e.target.value))}
                                          className="w-full text-xs font-mono bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500/50 disabled:opacity-50 appearance-none cursor-pointer"
                                        >
                                          <option value="24" className="bg-neutral-900">{t("24 Hours (Small Channels)", "24 часа (Маленькие каналы)")}</option>
                                          <option value="72" className="bg-neutral-900">{t("72 Hours (Medium Channels)", "72 часа (Средние каналы)")}</option>
                                          <option value="120" className="bg-neutral-900">{t("3 Days (Large Channels)", "3 дня (Крупные каналы)")}</option>
                                          <option value="168" className="bg-neutral-900">{t("1 Week (Giants)", "Неделя (Гиганты)")}</option>
                                        </select>
                                      </div>
                                    </div>

                                    {/* Dynamic Financial Math Indicators */}
                                    <div className="grid grid-cols-3 gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5 text-center font-mono text-[9px]">
                                      <div className="border-r border-white/5 last:border-none">
                                        <span className="text-neutral-500 block uppercase font-bold text-[7.5px] leading-tight mb-0.5">{t("TWA VALUATION", "КАПИТАЛИЗАЦИЯ")}</span>
                                        <span className="text-white font-bold text-xs">{formatNumber(adminSharesSupply * adminSharePrice, 2)} USDT</span>
                                      </div>
                                      <div className="border-r border-white/5 last:border-none">
                                        <span className="text-neutral-500 block uppercase font-bold text-[7.5px] leading-tight mb-0.5">{t("CREATOR VEST (70%)", "ДОЛЯ СОЗДАТЕЛЯ (70%)")}</span>
                                        <span className="text-neutral-300 font-bold text-xs">{formatNumber(adminSharesSupply * 0.70, 0)}</span>
                                      </div>
                                      <div>
                                        <span className="text-neutral-500 block uppercase font-bold text-[7.5px] leading-tight mb-0.5">{t("PUBLIC FLOAT (30%)", "ПУБЛИЧНЫЙ ПУЛ (30%)")}</span>
                                        <span className="text-sky-400 font-bold text-xs">{formatNumber(adminSharesSupply * 0.30, 0)}</span>
                                      </div>
                                    </div>

                                    {/* Smart Contract Files Tab System */}
                                    <div className="space-y-1.5 relative overflow-hidden">
                                      <div className="flex items-center gap-1.5 border-b border-white/5 pb-1 font-mono text-[8px] tracking-wider text-neutral-500 uppercase font-bold">
                                        <span>{t("ACTON WORKSPACE SOURCES:", "ИСХОДНЫЕ ФАЙЛЫ ACTON:")}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {(["code", "abi", "config"] as const).map((tab) => {
                                          const tabLabels = {
                                            code: "equity_contract.act",
                                            abi: "abi_descriptor.json",
                                            config: "acton.config.json"
                                          };
                                          return (
                                            <button
                                              key={tab}
                                              type="button"
                                              disabled={isCompilingActon}
                                              onClick={() => setAdminActiveCodeTab(tab)}
                                              className={`px-2.5 py-1 text-[8.5px] font-mono rounded-lg transition-all border ${
                                                adminActiveCodeTab === tab
                                                  ? "bg-[#232323] text-sky-400 border-sky-500/20"
                                                  : "bg-transparent text-neutral-400 border-transparent hover:text-white"
                                              }`}
                                            >
                                              {tabLabels[tab]}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {/* Code workspace panel */}
                                      <div className="relative">
                                        <pre className="p-3.5 bg-black/60 rounded-xl font-mono text-[9px] text-neutral-400 leading-normal overflow-x-auto max-h-[160px] text-left border border-white/5 select-all scrollbar-thin">
                                          {getAdminActonContractAsset(req.channelName, req.channelHandle, adminSharesSupply, adminSharePrice, adminActiveCodeTab)}
                                        </pre>

                                        {/* Compilation Live Overlay Log overlay */}
                                        {isCompilingActon && (
                                          <div className="absolute inset-0 bg-black/85 backdrop-blur-[1px] rounded-xl flex flex-col justify-center items-center p-4">
                                            <div className="w-full space-y-2 max-w-[280px]">
                                              <div className="flex items-center justify-between text-[9px] font-mono text-sky-400 font-bold uppercase tracking-wider">
                                                <span>{t("ACTON COMPILING...", "ACTON КОМПИЛИРУЕТ...")}</span>
                                                <span className="animate-pulse">{actonCompilationStep * 25}%</span>
                                              </div>
                                              <div className="w-full bg-neutral-900 border border-white/5 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                  className="bg-sky-500 h-full transition-all duration-500 rounded-full"
                                                  style={{ width: `${actonCompilationStep * 25}%` }}
                                                />
                                              </div>
                                              <div className="text-[8px] font-mono text-neutral-400 italic font-medium">
                                                {actonCompilationStep === 1 && `[ACTON] ${t("Analyzing code AST tree & standard library imports...", "Анализ синтаксического дерева кода и библиотек...")}`}
                                                {actonCompilationStep === 2 && `[ACTON] ${t("Optimizing bytecode size and resolving USDT execution registers...", "Оптимизация размера байткода и USDT-регистров...")}`}
                                                {actonCompilationStep === 3 && `[ACTON] ${t("Simulating gas fees... Estimated limit: 120 microUSDT.", "Оценка комиссий газа... Лимит: 120 microUSDT.")}`}
                                                {actonCompilationStep === 4 && `[ACTON] ${t("Deploying smart contract to USDT Network. Registering digital blocks...", "Деплой смарт-контракта в сеть USDT. Регистрация блоков...")}`}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Actions button */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                      <button
                                        type="button"
                                        disabled={isCompilingActon}
                                        onClick={() => startActonCompilation(req.id)}
                                        className="flex-1 py-2.5 rounded-2xl bg-sky-500 text-black hover:bg-sky-400 disabled:opacity-50 font-sans font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/15"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                                        {t("COMPILE & DEPLOY ON USDT BOARD", "СКОМПИЛИРОВАТЬ И ВЫПУСТИТЬ")}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isCompilingActon}
                                        onClick={() => setAdminDeployingReqId(null)}
                                        className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/5 font-mono text-neutral-400 text-xs font-bold transition-all"
                                      >
                                        {t("Cancel", "Отмена")}
                                      </button>
                                    </div>
                                  </div>
                                ) : activeRejectId === req.id ? (
                                  <div className="space-y-3">
                                    <label className="text-[9px] font-mono uppercase text-neutral-400 block font-bold">
                                      {t("REJECTION FEEDBACK LOG (REASON)", "КОММЕНТАРИЙ С ПРИЧИНОЙ ОТКЛОНЕНИЯ")}
                                    </label>
                                    <textarea
                                      value={singleRejectReason}
                                      onChange={(e) => setSingleRejectReason(e.target.value)}
                                      placeholder={t("e.g. Bot subscription activity detected or invalid screenshot attached", "например: обнаружены накрутки или скриншот неинформативен")}
                                      className="w-full text-xs font-mono bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/50"
                                      rows={2}
                                    />
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleAdminRejectRequest(req.id, singleRejectReason);
                                          setActiveRejectId(null);
                                          setSingleRejectReason("");
                                        }}
                                        className="flex-1 py-2 rounded-2xl font-mono text-xs font-bold text-red-400 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 transition-all"
                                      >
                                        {t("Confirm Denial", "Подтвердить отклонение")}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveRejectId(null);
                                          setSingleRejectReason("");
                                        }}
                                        className="px-4 py-2 rounded-2xl font-mono text-xs text-neutral-400 bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                                      >
                                        {t("Cancel", "Отмена")}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (adminRole !== "super_admin" && adminRole !== "moderator") {
                                          alert(language === "ru"
                                            ? "Отказано: Одобрение заявок разрешено только для SUPER_ADMIN или MODERATOR."
                                            : "Denied: Approving listings requires SUPER_ADMIN or MODERATOR credentials!");
                                          return;
                                        }
                                        const estValuation = (req.subscribers * 0.15) + (req.monthlyRevenue * 15);
                                        const estPrice = parseFloat((estValuation / 5000000).toFixed(4)) || 0.05;
                                        setAdminSharesSupply(5000000);
                                        setAdminSharePrice(estPrice);
                                        setAdminDeployingReqId(req.id);
                                        setActiveRejectId(null);
                                      }}
                                      className="flex-1 py-2.5 rounded-2xl bg-green-500 text-black hover:bg-green-400 font-sans font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-green-500/10"
                                    >
                                      <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                                      {t("APPROVE & DEPLOY ON-CHAIN", "ОДОБРИТЬ И ЗАПУСТИТЬ")}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (adminRole !== "super_admin" && adminRole !== "moderator") {
                                          alert(language === "ru"
                                            ? "Отказано: Отклонение заявок разрешено только для SUPER_ADMIN или MODERATOR."
                                            : "Denied: Rejecting listings requires SUPER_ADMIN or MODERATOR credentials!");
                                          return;
                                        }
                                        setActiveRejectId(req.id);
                                        setSingleRejectReason("");
                                        setAdminDeployingReqId(null);
                                      }}
                                      className="px-4 py-2.5 rounded-2xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 font-mono text-red-400 text-xs font-bold transition-all"
                                    >
                                      {t("REJECT", "ОТКЛОНИТЬ")}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                )}

                {/* Interactive Database Workbench */}
                {adminSubTab === "database" && (
                  <div className="space-y-4 page-fade-enter">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <h3 className="text-[11px] font-mono font-bold tracking-wider text-neutral-400 uppercase">
                        🗄️ {t("INTERACTIVE DATABASE SYSTEM", "ИНТЕРАКТИВНЫЙ МЕНЕДЖЕР БАЗЫ ДАННЫХ")}
                      </h3>
                      <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 font-mono text-[9px] w-full sm:w-auto">
                        {(["users", "channels", "audit"] as const).map((tbl) => (
                          <button
                            key={tbl}
                            onClick={() => setDbSelectedTable(tbl)}
                            className={`flex-1 sm:flex-none px-3 py-1 rounded-md uppercase font-bold tracking-wider transition-all ${
                              dbSelectedTable === tbl
                                ? "bg-[#232323] text-white"
                                : "text-neutral-500 hover:text-neutral-300"
                            }`}
                          >
                            {tbl === "users" ? t("Users", "Юзеры") : tbl === "channels" ? t("Channels", "Каналы") : t("Logs", "Логи")}
                          </button>
                        ))}
                      </div>
                    </div>

                    {dbSelectedTable === "users" && (
                      <div className="space-y-3">
                        {adminRole !== "super_admin" && adminRole !== "financial_auditor" && adminRole !== "risk_analyst" && (
                          <div className="p-3 bg-amber-950/15 border border-amber-500/10 text-[10px] text-amber-400 rounded-xl text-left">
                            ℹ️ {t("Database Read-Only. Balance or compliance adjustments require SUPER_ADMIN, RISK_ANALYST, or FINANCIAL_AUDITOR privilege.", "Доступ только для чтения. Для изменения балансов или ролей смените права сессии.")}
                          </div>
                        )}

                        <div className="border border-white/5 rounded-2xl overflow-x-auto bg-[#141416]">
                          <table className="w-full text-left font-mono text-[10px] border-collapse min-w-[550px]">
                            <thead>
                              <tr className="bg-white/5 font-bold uppercase text-[7.5px] text-neutral-500 border-b border-white/5">
                                <th className="p-3">{t("USER KEY", "ПОЛЬЗОВАТЕЛЬ")}</th>
                                <th className="p-3">{t("WALLET", "КОШЕЛЕК")}</th>
                                <th className="p-3 text-center">{t("ROLE", "РОЛЬ")}</th>
                                <th className="p-3 text-center">{t("STATUS", "СТАТУС")}</th>
                                <th className="p-3 text-right">{t("USDT BALANCE", "БАЛАНС USDT")}</th>
                                <th className="p-3 text-right">{t("MANAGEMENT", "ОПЕРАЦИИ")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {users.map((user) => (
                                <React.Fragment key={user.id}>
                                  <tr className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                                    <td className="p-3">
                                      <span className="font-semibold text-white block truncate max-w-[130px]">{user.email}</span>
                                      {user.id === "user_current" && (
                                        <span className="text-[7px] bg-sky-950/40 text-sky-400 border border-sky-500/15 tracking-widest px-1 py-[1.5px] rounded uppercase font-bold text-center mt-0.5 inline-block">
                                          {t("CURRENT SESSION", "ТЕКУЩИЙ ЮЗЕР")}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3 font-mono text-[9px] text-sky-400">
                                      <span className="truncate max-w-[120px] block" title={user.walletAddress}>
                                        {user.walletAddress}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className={`px-1 rounded font-bold text-[8px] ${
                                        user.role === "super_admin" ? "bg-red-950/30 text-red-400" :
                                        user.role === "moderator" ? "bg-green-950/30 text-green-400" :
                                        user.role === "risk_analyst" ? "bg-amber-950/30 text-amber-400" :
                                        user.role === "financial_auditor" ? "bg-blue-950/30 text-blue-400" :
                                        "bg-neutral-850 text-neutral-500"
                                      }`}>
                                        {user.role}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className={`px-1.5 py-0.5 rounded font-bold text-[8px] uppercase ${
                                        user.status === "active" ? "text-green-400" : "bg-red-950/20 text-red-500 animate-pulse font-extrabold"
                                      }`}>
                                        {user.status === "active" ? "🟢 ACTIVE" : "🔴 BANNED"}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right font-semibold text-white">
                                      {formatNumber(user.tonBalance, 2)} USDT
                                    </td>
                                    <td className="p-3 text-right">
                                      <button
                                        onClick={() => {
                                          setEditingUserId(editingUserId === user.id ? null : user.id);
                                          setEditUserTon(user.tonBalance.toString());
                                          setEditUserUsdt(user.usdtBalance.toString());
                                          setEditUserRole(user.role);
                                          setEditUserStatus(user.status);
                                          setEditUserReason(user.suspensionReason || "");
                                        }}
                                        className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9.5px] text-white border border-white/5 transition-all font-bold"
                                      >
                                        {editingUserId === user.id ? t("Close", "Закрыть") : "⚙️ " + t("Revising", "Правка")}
                                      </button>
                                    </td>
                                  </tr>

                                  {editingUserId === user.id && (
                                    <tr>
                                      <td colSpan={6} className="bg-black/40 p-4 border-b border-white/5 text-left">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 items-end">
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">{t("USDT LEDGER", "БАЛАНС USDT")}</label>
                                            <input
                                              type="number"
                                              value={editUserTon}
                                              disabled={adminRole !== "super_admin" && adminRole !== "financial_auditor"}
                                              onChange={(e) => setEditUserTon(e.target.value)}
                                              className="w-full bg-[#18181c] border border-white/5 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500/50 disabled:opacity-50 font-mono"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">{t("PRIVILEGE ROLE", "ПРАВА")}</label>
                                            <select
                                              value={editUserRole}
                                              disabled={adminRole !== "super_admin"}
                                              onChange={(e) => setEditUserRole(e.target.value)}
                                              className="w-full bg-[#18181c] border border-white/5 rounded-xl px-2.5 py-[5px] text-xs text-white focus:outline-none focus:border-sky-500/50 disabled:opacity-50 font-mono"
                                            >
                                              <option value="user">USER</option>
                                              <option value="moderator">MODERATOR</option>
                                              <option value="risk_analyst">RISK_ANALYST</option>
                                              <option value="financial_auditor">FINANCIAL_AUDITOR</option>
                                              <option value="super_admin">SUPER_ADMIN</option>
                                            </select>
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">{t("BLOCK STATUS", "БЛОКИРОВКА")}</label>
                                            <select
                                              value={editUserStatus}
                                              disabled={adminRole !== "super_admin" && adminRole !== "risk_analyst"}
                                              onChange={(e) => setEditUserStatus(e.target.value)}
                                              className="w-full bg-[#18181c] border border-white/5 rounded-xl px-2.5 py-[5px] text-xs text-white focus:outline-none focus:border-[#fc5454]/50 disabled:opacity-50 font-mono"
                                            >
                                              <option value="active">🟢 ACTIVE</option>
                                              <option value="banned">🔴 BANNED / FROZEN</option>
                                            </select>
                                          </div>
                                        </div>

                                        {editUserStatus === "banned" && (
                                          <div className="mt-3 space-y-1">
                                            <label className="text-[8px] font-mono text-red-400 uppercase tracking-widest font-bold block">{t("BAN REASON LOG", "ОБОСНОВАНИЕ БЛОКИРОВКИ")}</label>
                                            <input
                                              type="text"
                                              value={editUserReason}
                                              disabled={adminRole !== "super_admin" && adminRole !== "risk_analyst"}
                                              onChange={(e) => setEditUserReason(e.target.value)}
                                              placeholder={t("Market manipulation attempt or safety protocol breach", "Попытка накрутки или нарушение регламента торгов")}
                                              className="w-full bg-[#18181c] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                                            />
                                          </div>
                                        )}

                                        <div className="mt-3 flex justify-end gap-2 border-t border-white/5 pt-2.5">
                                          <button
                                            onClick={() => setEditingUserId(null)}
                                            className="px-3.5 py-1.5 bg-neutral-950 hover:bg-neutral-900 border border-white/5 text-neutral-400 rounded-xl text-[9px] font-mono font-bold uppercase"
                                          >
                                            {t("Cancel", "Отмена")}
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (user.role !== editUserRole && adminRole !== "super_admin") {
                                                alert("Denied: Changing user role requires SUPER_ADMIN authority.");
                                                return;
                                              }
                                              if (user.status !== editUserStatus && adminRole !== "super_admin" && adminRole !== "risk_analyst") {
                                                alert("Denied: Triggering user blocks requires SUPER_ADMIN or RISK_ANALYST authority.");
                                                return;
                                              }
                                              if ((user.tonBalance !== parseFloat(editUserTon) || user.usdtBalance !== parseFloat(editUserUsdt)) && adminRole !== "super_admin" && adminRole !== "financial_auditor") {
                                                alert("Denied: Minting state balances requires SUPER_ADMIN or FINANCIAL_AUDITOR authority.");
                                                return;
                                              }

                                              const updatedTon = parseFloat(editUserTon) || 0;
                                              const updatedUsdt = parseFloat(editUserUsdt) || 0;

                                              setUsers((prev) =>
                                                prev.map((u) =>
                                                  u.id === user.id
                                                    ? {
                                                        ...u,
                                                        tonBalance: updatedTon,
                                                        usdtBalance: updatedUsdt,
                                                        role: editUserRole as any,
                                                        status: editUserStatus as any,
                                                        suspensionReason: editUserStatus === "banned" ? editUserReason : "",
                                                      }
                                                    : u
                                                )
                                              );

                                              if (user.id === "user_current") {
                                                setTonBalance(updatedTon);
                                                setUsdtBalance(updatedUsdt);
                                              }

                                              setEditingUserId(null);
                                              alert("Database row committed successfully.");
                                            }}
                                            className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-black rounded-xl text-[9px] font-mono tracking-wider font-extrabold uppercase"
                                          >
                                            💾 {t("COMMIT ROW", "ЗАПИСАТЬ СТРОКУ")}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-[#1E1E1E] p-4 rounded-2xl border border-white/5 text-left">
                          <span className="text-[10px] text-neutral-400 leading-normal">
                            {t("Wipe sandbox caches to reload default users database.", "Удалить кэш симулятора для исходного сброса базы данных.")}
                          </span>
                          <button
                            onClick={() => {
                              if (confirm("Recreate Database seed defaults? Your current balances, user bans and customized settings will revert.")) {
                                localStorage.removeItem("ton_system_users_v5");
                                localStorage.removeItem("ton_system_settings_v5");
                                location.reload();
                              }
                            }}
                            className="px-3.5 py-1.5 bg-red-950/20 hover:bg-red-950/45 border border-[#ef4444]/20 text-red-400 text-[9px] font-mono uppercase font-bold rounded-xl transition-all"
                          >
                            ⚠️ RESET SANDBOX DB
                          </button>
                        </div>
                      </div>
                    )}

                    {dbSelectedTable === "channels" && (
                      <div className="border border-white/5 rounded-2xl overflow-x-auto bg-[#141416]">
                        <table className="w-full text-left font-mono text-[10px] border-collapse min-w-[500px]">
                          <thead>
                            <tr className="bg-white/5 font-bold uppercase text-[7.5px] text-neutral-500 border-b border-white/5">
                              <th className="p-3">{t("PROJECT TITLE", "КАНАЛ / ПРОЕКТ")}</th>
                              <th className="p-3">{t("SHARE PRICE", "ЦЕНА АКЦИИ")}</th>
                              <th className="p-3 text-right">{t("PASSIVE STAKING YIELD APY %", "СТАВКА СТЕЙКИНГА APY")}</th>
                              <th className="p-3 text-right">{t("FLOAT / SPREAD", "ОБЪЕМ")}</th>
                              <th className="p-3 text-right">{t("MARKET MATCH", "СОСТОЯНИЕ")}</th>
                              <th className="p-3 text-right">{t("ACTIONS", "ДЕЙСТВИЯ")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {channels.map((chan) => (
                              <tr key={chan.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                                <td className="p-3">
                                  <span className="font-bold text-white block">{chan.channelName}</span>
                                  <span className="text-[8.5px] text-neutral-500 mt-0.5">@{chan.handle}</span>
                                </td>
                                <td className="p-3 text-sky-400 font-bold">{formatNumber(chan.sharePrice, 4)} USDT</td>
                                <td className="p-3 text-right align-middle">
                                  <input
                                    type="number"
                                    step="0.5"
                                    disabled={adminRole !== "super_admin" && adminRole !== "financial_auditor"}
                                    value={chan.yieldPercent}
                                    onChange={(e) => {
                                      const nv = parseFloat(e.target.value) || 0;
                                      setChannels((prev) =>
                                        prev.map((c) => (c.id === chan.id ? { ...c, yieldPercent: nv } : c))
                                      );
                                    }}
                                    className="w-14 text-right bg-neutral-900 border border-white/5 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-white/20 font-mono disabled:opacity-50"
                                  />
                                  <span className="text-[10px] text-neutral-500 ml-1">% APY</span>
                                </td>
                                <td className="p-3 text-right">
                                  <div>{chan.floatPercent}% TWA Float</div>
                                  <div className="text-[8.5px] text-neutral-500 mt-0.5">{formatNumber(chan.holdersCount || 230)} slots</div>
                                </td>
                                <td className="p-3 text-right">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${
                                    chan.tdaProgress < 100 && chan.tdaProgress >= 0 ? "text-amber-400 bg-amber-950/20" : 
                                    chan.tdaProgress < 0 ? "text-red-400 bg-red-950/20" : "text-green-400 bg-green-950/20"
                                  }`}>
                                    {chan.tdaProgress >= 0 && chan.tdaProgress !== 100 ? `${chan.tdaProgress}% PUBLIC TWA` : chan.tdaProgress < 0 ? "FAILED TWA" : "SECONDARY REGIME"}
                                  </span>
                                </td>
                                <td className="p-3 text-right align-middle">
                                  {chan.tdaProgress >= 0 && chan.tdaProgress !== 100 && (
                                    <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => setChannels(prev => prev.map(c => c.id === chan.id ? { ...c, tdaEndTime: Date.now() - 1000 } : c))}
                                        className="bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-900/50 px-2 py-1 rounded text-[8px] font-bold uppercase transition-colors"
                                      >
                                        End
                                      </button>
                                      <button 
                                        onClick={() => setChannels(prev => prev.map(c => c.id === chan.id ? { ...c, tdaProgress: -1, tdaEndTime: Date.now() - 1000 } : c))}
                                        className="bg-red-950/30 text-red-400 border border-red-500/20 hover:bg-red-900/50 px-2 py-1 rounded text-[8px] font-bold uppercase transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                  {chan.tdaProgress === 100 && (
                                    <span className="text-[8px] text-zinc-500 font-mono">COMPLETE</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {dbSelectedTable === "audit" && (
                      <div className="border border-white/5 rounded-2xl bg-[#141416]/40 p-4 font-mono text-[9px] text-left">
                        <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                          <span className="text-zinc-500 font-bold uppercase tracking-wider">SECURE SHARDS TELEMETRY AUDIT</span>
                          <span className="text-green-400 font-extrabold flex items-center gap-1">🟢 SECURE COMPLIANCE</span>
                        </div>
                        <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin">
                          {activity.map((act) => (
                            <div key={act.id} className="border-b border-white/5 pb-2 last:border-none flex items-start gap-2 text-zinc-400">
                              <span className="text-neutral-600 font-bold">{act.timestamp.split(" ")[1] || "00:00"}</span>
                              <span className={`px-1 rounded text-[7.5px] font-bold shrink-0 ${
                                act.type === "BUY" ? "text-green-400 bg-green-950/30" :
                                act.type === "SELL" ? "text-[#f85149] bg-red-950/30" :
                                "text-sky-400 bg-sky-950/20"
                              }`}>{act.type}</span>
                              <div className="flex-1">
                                <span className="font-semibold text-white">{act.channelName}</span>
                                <span className="text-neutral-500 text-[8.5px] ml-1.5">{act.details}</span>
                              </div>
                              {act.amountTON > 0 && <span className="text-white font-bold text-[9.5px]">+{formatNumber(act.amountTON, 2)} USDT</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Safety Policies Group */}
                {adminSubTab === "safety" && (
                  <div className="space-y-4 page-fade-enter text-left">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Interactive session aspect switch */}
                      <div className="bg-[#1E1E1E] border border-white/5 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-sky-400 font-mono text-[10.5px] font-bold">
                            <Users className="w-4 h-4" />
                            <span>{t("system SESSION ASPECT SWITCHER", "СЕЛЕКТОР ПРАВ СЕССИИ")}</span>
                          </div>
                          <p className="text-[9.5px] text-neutral-400 leading-normal">
                            {t("QA play mock administrative access instantly. Switch statuses on the fly to review restrictive routes and warning layouts as they trigger.", "Эмулируйте любой тип административных прав 'на лету' для тестирования ограничений.")}
                          </p>
                        </div>
                        <select
                          value={adminRole}
                          onChange={(e) => {
                            const nr = e.target.value as any;
                            setAdminRole(nr);
                            alert(`Session operator role updated: ${nr.toUpperCase()}`);
                          }}
                          className="w-full bg-[#141416] border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none mt-2"
                        >
                          <option value="super_admin">💼 SUPER_ADMIN (General Root)</option>
                          <option value="risk_analyst">🛡️ RISK_ANALYST (Compliance)</option>
                          <option value="moderator">🚀 MODERATOR (Listing Approver)</option>
                          <option value="financial_auditor">💵 FINANCIAL_AUDITOR (Minting Ledger)</option>
                        </select>
                      </div>

                      {/* Limit configuration slider */}
                      <div className="bg-[#1E1E1E] border border-white/5 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-sky-400 font-mono text-[10.5px] font-bold">
                            <Sliders className="w-4 h-4" />
                            <span>{t("SYSTEM CONSTRAINTS CAP", "РЕГУЛИРУЕМЫЕ ЛИМИТЫ")}</span>
                          </div>
                          <p className="text-[9.5px] text-neutral-400 leading-normal">
                            {t("Limit sandbox security risk vectors by managing maximum allowed deal capital limit on custom asset trading activities.", "Регулируйте максимальный объем одной торговой транзакции в пуле.")}
                          </p>
                        </div>

                        <div className="space-y-1 mt-2">
                          <div className="flex justify-between items-center text-[9.5px] font-mono text-neutral-400">
                            <span>{t("Single Trade Cap Amount", "Макс. USDT на 1 сделку")}</span>
                            <span className="text-white font-bold">{formatNumber(systemSettings.maxSingleTradeTon, 0)} USDT</span>
                          </div>
                          <input
                            type="range"
                            min="25"
                            max="5000"
                            step="25"
                            disabled={adminRole !== "super_admin" && adminRole !== "risk_analyst"}
                            value={systemSettings.maxSingleTradeTon}
                            onChange={(e) => {
                              setSystemSettings((prev) => ({
                                ...prev,
                                maxSingleTradeTon: parseInt(e.target.value) || 1000,
                              }));
                            }}
                            className="w-full h-1 bg-neutral-950 rounded appearance-none cursor-pointer accent-sky-500 disabled:opacity-30"
                          />
                          <span className="text-[7.5px] font-mono text-neutral-500 block">{t("Adjustments require SUPER_ADMIN or RISK_ANALYST privileges.", "Изменение доступно для SUPER_ADMIN или RISK_ANALYST.")}</span>
                        </div>
                      </div>

                      {/* Dynamic Fee config slider */}
                      <div className="bg-[#1E1E1E] border border-white/5 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-amber-500 font-mono text-[10.5px] font-bold">
                            <Coins className="w-4 h-4 text-amber-400" />
                            <span>{t("PLATFORM TRANSACTION COMMISSIONS", "ПЛАТФОРМЕННЫЕ КОМИССИИ")}</span>
                          </div>
                          <p className="text-[9.5px] text-neutral-400 leading-normal">
                            {t("Configure real-time secondary market trade fees. Withdraw centralized reserve liquidity to moderator mainframe.", "Настройте процентную ставку торговой комиссии при купле/продаже долей в пулах.")}
                          </p>
                        </div>

                        <div className="space-y-2 mt-2 font-sans text-neutral-500">
                          <div className="flex justify-between items-center text-[9.5px] font-mono text-neutral-400">
                            <span>{t("Trade Fee Multiplier", "Комиссия с транзакций")}</span>
                            <span className="text-white font-bold font-mono">{platformFeePercent}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="5.0"
                            step="0.1"
                            disabled={adminRole !== "super_admin" && adminRole !== "financial_auditor"}
                            value={platformFeePercent}
                            onChange={(e) => {
                              setPlatformFeePercent(parseFloat(e.target.value) || 1.5);
                            }}
                            className="w-full h-1 bg-neutral-950 rounded appearance-none cursor-pointer accent-amber-500 disabled:opacity-30"
                          />
                          <span className="text-[7.5px] font-mono text-neutral-500 block mb-1">{t("Requires SUPER_ADMIN or FINANCIAL_AUDITOR.", "Доступно только SUPER_ADMIN или FINANCIAL_AUDITOR.")}</span>

                          <div className="bg-black/35 p-2 px-2.5 rounded-xl border border-white/5 flex items-center justify-between font-mono text-[8.5px]">
                            <div>
                              <span className="text-neutral-500 block text-[7px] font-bold uppercase">{t("HARVESTED PROTOCOL FEES", "СОБРАНО КОМИССИЙ")}</span>
                              <span className="text-[#26A17B] font-extrabold text-xs">{formatNumber(accumulatedReservePool, 2)} USDT</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (accumulatedReservePool <= 0) {
                                  alert(t("Reserve pool is already empty.", "Резервный пул пуст."));
                                  return;
                                }
                                setTonBalance((prev) => prev + accumulatedReservePool);
                                const claimLog = {
                                  id: `log_${Date.now()}`,
                                  userId: "system",
                                  timestamp: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString().slice(0, 5)}`,
                                  type: "MINT" as any,
                                  channelName: "Fee Withdrawal",
                                  amountTON: accumulatedReservePool,
                                  details: `Transferred accumulated platform protocol reserves (${accumulatedReservePool.toFixed(2)} USDT) into General Administrator admin-role session balance.`
                                };
                                setActivity((prev) => [claimLog, ...prev]);
                                alert(t(`Success: Claimed ${formatNumber(accumulatedReservePool, 2)} USDT to administrative ledger.`, `Успешно: Вывели ${formatNumber(accumulatedReservePool, 2)} USDT на системный кошелек.`));
                                setAccumulatedReservePool(0);
                              }}
                              className="px-2 py-1 bg-green-500 hover:bg-green-400 text-black rounded-lg text-[8px] font-sans font-bold transition-all cursor-pointer focus:outline-none border-0"
                            >
                              {t("CLAIM", "ВЫВЕСТИ")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Circuit breakers war cabinet */}
                    <div className="bg-[#1E1E1E] border border-white/5 p-4 rounded-3xl space-y-4">
                      <div className="flex items-center gap-1.5 text-red-400 font-mono text-[10.5px] font-bold uppercase">
                        <Shield className="w-4 h-4 text-red-500 animate-pulse" />
                        <span>{t("EMERGENCY WAR CABINET RESTRAINTS", "КОНСОЛЬ ЭКСТРЕННЫХ БЛОКИРОВОК (EMERGENCY BREAKERS)")}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* trading toggle */}
                        <div className={`p-4 border rounded-xl flex flex-col justify-between gap-3 transition-all ${
                          systemSettings.tradingHalted ? "bg-red-950/20 border-red-500/25 text-red-400" : "bg-black/15 border-white/5 text-neutral-400"
                        }`}>
                          <div>
                            <span className="text-[8px] font-mono font-bold uppercase block tracking-wider">{t("HALT REVENUE TRADING", "БЛОК ТОРГОВ")}</span>
                            <p className="text-[9.5px] text-zinc-500 mt-1 leading-normal">{t("Instantly halts secondary markets buying & selling of shares globally.", "Останавливает операции купли-продажи на бирже по всем контрактам.")}</p>
                          </div>
                          <button
                            onClick={() => {
                              if (adminRole !== "super_admin" && adminRole !== "risk_analyst") {
                                alert("Denied: Risk toggle requires SUPER_ADMIN or RISK_ANALYST privileges!");
                                return;
                              }
                              setSystemSettings((prev) => ({ ...prev, tradingHalted: !prev.tradingHalted }));
                            }}
                            className={`py-1.5 rounded-lg text-[10px] font-mono tracking-widest uppercase font-bold text-center ${
                              systemSettings.tradingHalted ? "bg-[#ff4444] text-black" : "bg-neutral-850 hover:bg-neutral-800 text-white"
                            }`}
                          >
                            {systemSettings.tradingHalted ? t("HALTED ⚠️", "ТОРГИ ЗАБЛОКИРОВАНЫ") : t("HALT ALL TRADE", "ЗАБЛОКИРОВАТЬ")}
                          </button>
                        </div>

                        {/* deposits toggle */}
                        <div className={`p-4 border rounded-xl flex flex-col justify-between gap-3 transition-all ${
                          systemSettings.depositsFrozen ? "bg-red-950/20 border-red-500/25 text-red-400" : "bg-black/15 border-white/5 text-neutral-400"
                        }`}>
                          <div>
                            <span className="text-[8px] font-mono font-bold uppercase block tracking-wider">{t("FREEZE WALLET INFLOWS", "БЛОК ПОПОЛНЕНИЯ")}</span>
                            <p className="text-[9.5px] text-zinc-500 mt-1 leading-normal">{t("Locks users capability of depositing and minting USDT test tokens.", "Останавливает возможность пополнять криптовалютный кошелек.")}</p>
                          </div>
                          <button
                            onClick={() => {
                              if (adminRole !== "super_admin" && adminRole !== "risk_analyst") {
                                alert("Denied: Risk toggle requires SUPER_ADMIN or RISK_ANALYST privileges!");
                                return;
                              }
                              setSystemSettings((prev) => ({ ...prev, depositsFrozen: !prev.depositsFrozen }));
                            }}
                            className={`py-1.5 rounded-lg text-[10px] font-mono tracking-widest uppercase font-bold text-center ${
                              systemSettings.depositsFrozen ? "bg-[#ff4444] text-black" : "bg-neutral-850 hover:bg-neutral-800 text-white"
                            }`}
                          >
                            {systemSettings.depositsFrozen ? t("FROZEN ❄️", "ДЕПОЗИТЫ ЗАМОРОЖЕНЫ") : t("FREEZE INFLOW", "ЗАМОРОЗИТЬ")}
                          </button>
                        </div>

                        {/* tda limit toggle */}
                        <div className={`p-4 border rounded-xl flex flex-col justify-between gap-3 transition-all ${
                          systemSettings.tdaSubmissionLimit ? "bg-red-950/20 border-red-500/25 text-red-400" : "bg-black/15 border-white/5 text-neutral-400"
                        }`}>
                          <div>
                            <span className="text-[8px] font-mono font-bold uppercase block tracking-wider">{t("LOCK TWA REGISTRATIONS", "ПРИОСТАНОВИТЬ ЗАЯВКИ")}</span>
                            <p className="text-[9.5px] text-zinc-500 mt-1 leading-normal">{t("Closes eligibility for creators to propose new listings in application panel.", "Временно выключает форму подачи заявок для создателей каналов.")}</p>
                          </div>
                          <button
                            onClick={() => {
                              if (adminRole !== "super_admin" && adminRole !== "risk_analyst") {
                                alert("Denied: Risk toggle requires SUPER_ADMIN or RISK_ANALYST privileges!");
                                return;
                              }
                              setSystemSettings((prev) => ({ ...prev, tdaSubmissionLimit: !prev.tdaSubmissionLimit }));
                            }}
                            className={`py-1.5 rounded-lg text-[10px] font-mono tracking-widest uppercase font-bold text-center ${
                              systemSettings.tdaSubmissionLimit ? "bg-[#ff4444] text-black" : "bg-neutral-850 hover:bg-neutral-800 text-white"
                            }`}
                          >
                            {systemSettings.tdaSubmissionLimit ? t("STOPPED 🛑", "ПРИЕМ ПРИОСТАНОВЛЕН") : t("PAUSE RECEIPT", "ОТКЛЮЧИТЬ ПРИЕМ")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Helicopter Minting & Faucet airdrops */}
                {adminSubTab === "minting" && (
                  <div className="space-y-6 page-fade-enter text-left font-sans">
                    {/* Live blockchain status widget */}
                    <div className="bg-[#111113] border border-white/[0.04] p-4 rounded-3xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-sky-400 animate-spin" style={{ animationDuration: "4s" }} />
                          <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                            {t("USDT SECURE SYSTEM MAINNET", "USDT SECURE SYSTEM MAINNET")}
                          </span>
                        </div>
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-green-500/30 text-green-400 bg-green-950/20 uppercase font-bold tracking-widest">
                          {t("CONVERGED", "КОНСЕНСУС")}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center font-mono text-[9px]">
                        <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                          <span className="text-neutral-500 text-[7px] block uppercase font-bold">{t("BLOCK HEIGHT", "ВЫСОТА БЛОКА")}</span>
                          <span className="text-white font-bold text-xs">{blockchainSimBlockHeight}</span>
                        </div>
                        <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                          <span className="text-neutral-500 text-[7px] block uppercase font-bold">{t("LATENCY", "ПИНГ СЕТИ")}</span>
                          <span className="text-sky-400 font-bold text-xs">{blockchainSimLatency}s</span>
                        </div>
                        <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                          <span className="text-neutral-500 text-[7px] block uppercase font-bold">{t("VALIDATORS", "ВАЛИДАТОРЫ")}</span>
                          <span className="text-[#0082c8] font-bold text-xs">{blockchainSimValidators} LIVE</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Direct on-board channel minter */}
                      <div className="bg-[#1E1E1E] border border-white/5 p-5 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                          <Plus className="w-4 h-4 text-sky-400" />
                          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest">
                            {t("MINT INSTANT KEY CHANNEL", "ВЫПУСТИТЬ ОНЧЕЙН-АКТИВ")}
                          </h4>
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest block font-bold">{t("Channel Title", "Название канала")}</label>
                              <input
                                type="text"
                                value={newChanName}
                                onChange={(e) => setNewChanName(e.target.value)}
                                placeholder="e.g. Durov's Channel"
                                className="w-full bg-[#141416]/90 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest block font-bold">{t("Username / Handle", "Юзернейм @")}</label>
                              <input
                                type="text"
                                value={newChanHandle}
                                onChange={(e) => setNewChanHandle(e.target.value)}
                                placeholder="@durov"
                                className="w-full bg-[#141416]/90 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500/50"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest block font-bold">{t("Price (USDT)", "Цена USDT")}</label>
                              <input
                                type="number"
                                step="0.01"
                                value={newChanPrice}
                                onChange={(e) => setNewChanPrice(e.target.value)}
                                className="w-full bg-[#141416]/90 border border-white/5 rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500/50 font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest block font-bold">{t("Supply / Эмиссия", "Эмиссия")}</label>
                              <input
                                type="number"
                                value={newChanSupply}
                                onChange={(e) => setNewChanSupply(e.target.value)}
                                className="w-full bg-[#141416]/90 border border-white/5 rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500/50 font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest block font-bold">{t("Staking APY %", "Доходность %")}</label>
                              <input
                                type="number"
                                step="0.5"
                                value={newChanYield}
                                onChange={(e) => setNewChanYield(e.target.value)}
                                className="w-full bg-[#141416]/90 border border-white/5 rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500/50 font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest block font-bold">{t("Market Category", "Категория актива")}</label>
                            <select
                              value={newChanCategory}
                              onChange={(e) => setNewChanCategory(e.target.value)}
                              className="w-full bg-[#141416]/90 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500/55 font-sans"
                            >
                              <option value="Finance">{t("Finance & Crypto", "Финансы и Крипта")}</option>
                              <option value="Tech">{t("Tech & Dev", "Технологии & Разработка")}</option>
                              <option value="Lifestyle">{t("Lifestyle & Media", "Медиа & Лайфстайл")}</option>
                              <option value="Entertainment">{t("Entertainment", "Развлечения")}</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            disabled={isMintingInLoadingState || !newChanName.trim() || !newChanHandle.trim()}
                            onClick={() => {
                              setIsMintingInLoadingState(true);
                              setMintingCompilationStep(1);
                              setTimeout(() => setMintingCompilationStep(2), 500);
                              setTimeout(() => setMintingCompilationStep(3), 1000);
                              setTimeout(() => {
                                const cleanH = newChanHandle.trim().startsWith("@") ? newChanHandle.trim().slice(1) : newChanHandle.trim();
                                const parsedPrice = Math.max(0.0001, parseFloat(newChanPrice) || 0.15);
                                const parsedSupply = Math.max(1, parseInt(newChanSupply) || 1000000);
                                const parsedYield = Math.max(0, parseFloat(newChanYield) || 12.0);

                                const subCount = Math.floor(Math.random() * 85000) + 15000;
                                const created: ChannelTDA = {
                                  id: `manual_${Date.now()}`,
                                  channelName: newChanName.trim(),
                                  handle: cleanH,
                                  sharePrice: parsedPrice,
                                  subscribers: `${(subCount / 1000).toFixed(0)}K`,
                                  subscriberCount: subCount,
                                  monthlyRevenue: Math.floor(Math.random() * 2000) + 300,
                                  valuation: Math.floor(parsedPrice * parsedSupply),
                                  countdownHours: 0,
                                  priceChange24h: 0.0,
                                  founderOwnershipPercent: 70,
                                  totalShares: parsedSupply,
                                  yieldPercent: parsedYield,
                                  floatPercent: 30,
                                  holdersCount: 1,
                                  tdaProgress: 100,
                                  category: newChanCategory,
                                };

                                setChannels((prev) => [created, ...prev]);

                                const newLog = {
                                  id: `log_${Date.now()}`,
                                  userId: "user_current",
                                  timestamp: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString().slice(0, 5)}`,
                                  type: "TDA" as any,
                                  channelName: newChanName.trim(),
                                  amountTON: 0,
                                  details: `Minted custom channel shares @${cleanH} (${parsedSupply} tokens at ${parsedPrice} USDT) with standard ${parsedYield}% staking yield.`
                                };
                                setActivity((prev) => [newLog, ...prev]);

                                setIsMintingInLoadingState(false);
                                setMintingCompilationStep(0);
                                setNewChanName("");
                                setNewChanHandle("");
                                alert(t("Success: Media Token share asset has been deployed dynamically onto the main market!", "Успех: Акции медиа-канала успешно сгенерированы и листингованы на Бирже!"));
                              }, 1500);
                            }}
                            className="w-full py-2.5 rounded-2xl bg-[#0082c8] hover:bg-[#0087d1] text-white font-sans font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/15 cursor-pointer mt-2 focus:outline-none border-0"
                          >
                            <Sparkles className="w-4 h-4 text-white" />
                            {isMintingInLoadingState 
                              ? `${t("DEPLOYING CONTRACT STEP", "ДЕПЛОЙ КОНТРАКТА ШАГ")} ${mintingCompilationStep}/3...`
                              : t("MINT AND DEPLOY DIRECTLY", "ВЫПУСТИТЬ И ЛИСТИНГОВАТЬ СРАЗУ")}
                          </button>
                        </div>
                      </div>

                      {/* Helicopter Airdrop module */}
                      <div className="bg-[#1E1E1E] border border-white/5 p-5 rounded-3xl space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                            <Coins className="w-4 h-4 text-amber-400 animate-bounce" style={{ animationDuration: "3s" }} />
                            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest">
                              {t("SYSTEM HELICOPTER AIRDROP INJECTOR", "ЛИКВИДНЫЙ HELICOPTER AIRDROP")}
                            </h4>
                          </div>

                          <div className="space-y-3 mt-3">
                            <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                              {t("Inject free-floating utility USDT test liquidity into sandbox participant balances globally. system users' holdings and trading action volumes automatically step up.", "Раздайте бесплатную ликвидность USDT всем или избранным участникам песочнице для поддержания торговых объемов на бирже.")}
                            </p>

                            <div className="space-y-2 font-sans">
                              <div className="space-y-1">
                                <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest block font-bold">{t("Airdrop Size (USDT)", "Объем раздачи (USDT)")}</label>
                                <select
                                  value={airdropAmount}
                                  onChange={(e) => setAirdropAmount(e.target.value)}
                                  className="w-full bg-[#141416]/90 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                >
                                  <option value="500">500 USDT {t("per member", "на участника")}</option>
                                  <option value="1500">1,500 USDT {t("standard boost", "стандартный буст")}</option>
                                  <option value="5000">5,000 USDT {t("whale grant", "грант кита")}</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest block font-bold">{t("Target Group", "Целевая группа")}</label>
                                <div className="grid grid-cols-2 gap-2 font-mono text-[9px]">
                                  <button
                                    type="button"
                                    onClick={() => setAirdropTarget("all")}
                                    className={`py-1.5 px-2 rounded-xl border text-center font-bold tracking-tight transition-all focus:outline-none cursor-pointer ${
                                      airdropTarget === "all"
                                        ? "bg-amber-950/35 border-amber-500/40 text-amber-400"
                                        : "bg-[#141416]/40 border-white/5 text-neutral-400 hover:text-white"
                                    }`}
                                  >
                                    🌐 {t("All Accounts", "Все аккаунты")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAirdropTarget("active")}
                                    className={`py-1.5 px-2 rounded-xl border text-center font-bold tracking-tight transition-all focus:outline-none cursor-pointer ${
                                      airdropTarget === "active"
                                        ? "bg-amber-950/35 border-amber-500/40 text-amber-400"
                                        : "bg-[#141416]/40 border-white/5 text-neutral-400 hover:text-white"
                                    }`}
                                  >
                                    🟢 {t("Only Active", "Только Активные")}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isAirdropInProgress}
                          onClick={() => {
                            setIsAirdropInProgress(true);
                            setTimeout(() => {
                              const amount = parseFloat(airdropAmount) || 1000;
                              
                              setUsers((prev) =>
                                prev.map((u) => {
                                  if (airdropTarget === "active" && u.status !== "active") return u;
                                  return {
                                    ...u,
                                    tonBalance: u.tonBalance + amount
                                  };
                                })
                              );

                              setTonBalance((prev) => prev + amount);

                              const airdropLog = {
                                id: `log_${Date.now()}`,
                                userId: "system",
                                timestamp: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString().slice(0, 5)}`,
                                type: "MINT" as any,
                                channelName: "Platform Airdrop Drop",
                                amountTON: amount,
                                details: `Dispatched ${amount} USDT test network grant to system participants successfully.`
                              };
                              setActivity((prev) => [airdropLog, ...prev]);

                              setIsAirdropInProgress(false);
                              alert(t(`Completed: ${amount} USDT dropped to sandbox participants. Current session balance increased!`, `Готово: Раздача ${amount} USDT успешно проведена! Ваш баланс кошелька также пополнен.`));
                            }, 1200);
                          }}
                          className="w-full py-2.5 rounded-2xl bg-amber-500 disabled:opacity-40 hover:bg-amber-400 text-black font-sans font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/15 cursor-pointer mt-4 focus:outline-none border-0"
                        >
                          <Coins className="w-4 h-4 text-black" />
                          {isAirdropInProgress ? t("BROADCASTING TO BLOCKS...", "РАССЫЛКА В БЛОКИ...") : t("TRIGGER DROPPING FAUCET", "РАСПРЕДЕЛИТЬ AIRDROP")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* News creation and slider management tab */}
                {adminSubTab === "news" && (
                  <div className="space-y-6 page-fade-enter text-left font-sans">
                    
                    {/* Role Authorization Check Alert */}
                    {adminRole !== "super_admin" && adminRole !== "moderator" && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-2xl flex items-center gap-3 text-xs">
                        <span className="text-sm">⚠️</span>
                        <div>
                          <p className="font-bold uppercase font-mono tracking-wide">{t("READ-ONLY ROLE SECURITY POLICY ACTIVE", "АКТИВЕН РЕЖИМ ТОЛЬКО ЧТЕНИЯ")}</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">{t("Your current administrator role does not have authorization to write, update or delete slider news notices. Publishing is restricted to SUPER_ADMIN or MODERATOR credentials.", "Ваша текущая роль администратора не дает прав на создание, редактирование или удаление новостных публикаций биржи. Редактирование разрешено только для SUPER_ADMIN или MODERATOR.")}</p>
                        </div>
                      </div>
                    )}

                    {/* News Management Stats header */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-[#111113] border border-white/[0.04] p-3.5 rounded-2xl flex flex-col justify-between">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">{t("ACTIVE SLIDES", "АКТИВНЫЕ СЛАЙДЫ")}</span>
                        <span className="text-white font-mono font-extrabold text-xl mt-1">{newsList.length}</span>
                        <span className="text-[7.5px] text-neutral-400 block mt-1">{t("Visible on live market dashboard carousel", "Отображаются в карусели на главном экране биржи")}</span>
                      </div>
                      
                      <div className="bg-[#111113] border border-white/[0.04] p-3.5 rounded-2xl flex flex-col justify-between">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">{t("AUTOPLAY INTERVAL", "АВТОПРОКРУТКА")}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => setIsNewsAutoplay(!isNewsAutoplay)}
                            className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-lg ${isNewsAutoplay ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}
                          >
                            {isNewsAutoplay ? t("ENABLED", "АКТИВНА") : t("DISABLED", "ОТКЛЮЧЕНА")}
                          </button>
                          <span className="text-white font-mono text-xs font-bold">5s {t("cycle", "цикл")}</span>
                        </div>
                        <span className="text-[7.5px] text-neutral-400 block mt-1">{t("Automatically cycles slides on market tab", "Автоматически листает слайды на вкладке Маркета")}</span>
                      </div>

                      <div className="bg-[#111113] border border-white/[0.04] p-3.5 rounded-2xl flex flex-col justify-between">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">{t("RECOVERY ACTIONS", "ВОССТАНОВЛЕНИЕ")}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewsList(NEWS_ITEMS);
                            setCurrentNewsIndex(0);
                            setRestoreSuccess(true);
                            setTimeout(() => {
                              setRestoreSuccess(false);
                            }, 2000);
                          }}
                          className={`mt-1 py-1 px-2.5 text-white border rounded-xl text-[9px] font-sans font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            restoreSuccess 
                              ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-400" 
                              : "bg-white/5 hover:bg-white/10 border-white/5"
                          }`}
                        >
                          {restoreSuccess ? `✓ ${t("RESTORED!", "ВОССТАНОВЛЕНО!")}` : `🔄 ${t("Restore Factory Defaults", "Сбросить к заводским")}`}
                        </button>
                        <span className="text-[7.5px] text-neutral-400 block mt-1">{t("Resets manually created items", "Удаляет все созданные вручную новости")}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      
                      {/* Form part: File-Upload Only */}
                      <div className="bg-[#1E1E1E] border border-white/5 p-6 rounded-3xl space-y-4 lg:col-span-12 xl:col-span-7">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                          <div className="flex items-center gap-2">
                            <UploadCloud className="w-4 h-4 text-[#0082c8]" />
                            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest">
                              {t("UPLOAD IMAGE TO CREATE SLIDE", "ЗАГРУЗКА ФОТО ДЛЯ НОВОГО СЛАЙДА")}
                            </h4>
                          </div>
                        </div>

                        {/* Uploader available to all administrator roles */}
                        <div className="space-y-4 font-sans">
                          <p className="text-xs text-neutral-400 leading-normal">
                            {t(
                              "To display a notice or banner on the main page of the exchange, simply drag or drop an image file here. The slide will immediately deploy to the front screen.",
                              "Чтобы опубликовать баннер на главной странице биржи, просто перетащите изображение в область ниже или нажмите для выбора файла. Слайд мгновенно отобразится в карусели."
                            )}
                          </p>

                          {/* Drag-and-Drop Photo Upload Area */}
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const file = e.dataTransfer.files?.[0];
                              if (file && file.type.startsWith("image/")) {
                                setIsNewsCoverFileLoading(true);
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const imgData = event.target?.result as string;
                                  setIsNewsCoverFileLoading(false);
                                  
                                  // Publish immediately!
                                  const createdNewsItem = {
                                    tagEn: "COMMUNITY RELEASE",
                                    tagRu: "АКТУАЛЬНОЕ",
                                    titleEn: `🔥 Updated Broadcast: ${file.name.slice(0, 18)}`,
                                    titleRu: `🔥 Публикация: ${file.name.slice(0, 18)}`,
                                    descEn: "New snapshot uploaded directly via administration panels.",
                                    descRu: "Снимок экрана загружен напрямую через панель управления.",
                                    dateEn: "JUST NOW",
                                    dateRu: "ТОЛЬКО ЧТО",
                                    bgClass: "from-blue-900/40 via-purple-950/20 to-neutral-950",
                                    borderGlow: "border-sky-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]",
                                    badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/10",
                                    coverImg: imgData
                                  };

                                  setNewsList((prev) => [createdNewsItem, ...prev]);
                                  setCurrentNewsIndex(0);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="border-2 border-dashed border-white/10 hover:border-[#0082c8]/60 bg-[#141416]/50 p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all hover:bg-[#0082c8]/5 group min-h-[140px]"
                            onClick={() => {
                              const inp = document.getElementById("admin-news-upload-direct-create");
                              if (inp) inp.click();
                            }}
                          >
                            <input
                              id="admin-news-upload-direct-create"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setIsNewsCoverFileLoading(true);
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const imgData = event.target?.result as string;
                                    setIsNewsCoverFileLoading(false);
                                    
                                    // Publish immediately!
                                    const createdNewsItem = {
                                      tagEn: "COMMUNITY RELEASE",
                                      tagRu: "АКТУАЛЬНОЕ",
                                      titleEn: `🔥 Updated Broadcast: ${file.name.slice(0, 18)}`,
                                      titleRu: `🔥 Публикация: ${file.name.slice(0, 18)}`,
                                      descEn: "New snapshot uploaded directly via administration panels.",
                                      descRu: "Снимок экрана загружен напрямую через панель управления.",
                                      dateEn: "JUST NOW",
                                      dateRu: "ТОЛЬКО ЧТО",
                                      bgClass: "from-blue-900/40 via-purple-950/20 to-neutral-950",
                                      borderGlow: "border-sky-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]",
                                      badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/10",
                                      coverImg: imgData
                                    };

                                    setNewsList((prev) => [createdNewsItem, ...prev]);
                                    setCurrentNewsIndex(0);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <UploadCloud className="w-8 h-8 text-neutral-500 group-hover:text-[#0082c8] group-hover:scale-110 transition-all duration-300" />
                            <span className="text-xs font-mono text-neutral-300 block group-hover:text-white mt-1">
                              {isNewsCoverFileLoading 
                                ? t("PROCESSING PHOTO...", "ОБРАБОТКА И ЗАГРУЗКА ФОТО...")
                                : t("DROP FILE HERE OR CLICK TO UPLOAD", "ПЕРЕТАЩИТЕ СЮДА ФОТО ИЛИ КЛИКНИТЕ")}
                            </span>
                            <span className="text-[10px] text-neutral-500 block">{t("Supports transparent PNG, JPG, WEBP", "Поддерживает PNG, JPG, WEBP")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Display / edit current list of slides */}
                      <div className="bg-[#1E1E1E] border border-white/5 p-5 rounded-3xl lg:col-span-12 xl:col-span-5 space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                          <Eye className="w-4 h-4 text-amber-400" />
                          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest">
                            {t("MANAGE NEWS SLIDER ITEMS", "УПРАВЛЕНИЕ ЛЕНТОЙ НОВОСТЕЙ")}
                          </h4>
                        </div>

                        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                          {newsList.map((news, index) => (
                            <div 
                              key={index} 
                              className={`p-3 rounded-2xl border transition-all relative ${
                                index === currentNewsIndex 
                                  ? "bg-white/[0.04] border border-sky-500/35" 
                                  : "bg-[#141416]/60 border border-white/5 hover:border-white/10"
                              }`}
                            >
                              <div className="flex items-start gap-2.5 text-left font-sans">
                                <div className="w-14 h-11 rounded-lg overflow-hidden bg-zinc-900 shrink-0 relative border border-white/5">
                                  <img 
                                    src={news.coverImg} 
                                    alt="News thumbnail" 
                                    className="w-full h-full object-cover" 
                                  />
                                  <span className="absolute bottom-0 right-0 bg-black/75 px-1 py-0.5 font-mono text-[7px] text-white rounded">
                                    #{index + 1}
                                  </span>
                                </div>

                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-mono font-bold text-white">
                                      {t("Slide", "Слайд")} #{index + 1}
                                    </span>
                                    <span className="text-[8px] text-neutral-500 font-mono">
                                      {language === "en" ? news.dateEn : news.dateRu}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-neutral-400 font-semibold truncate">
                                    {language === "en" ? (news.titleEn || "Banner Image") : (news.titleRu || "Изображение баннера")}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/[0.03] text-[9px] font-mono">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCurrentNewsIndex(index);
                                      setActiveTab("market");
                                      setTimeout(() => {
                                        const marketView = document.getElementById("market-viewport");
                                        if (marketView) {
                                          marketView.scrollIntoView({ behavior: 'smooth' });
                                        }
                                      }, 100);
                                    }}
                                    className="text-sky-450 hover:text-sky-400 font-bold cursor-pointer bg-none border-none outline-none flex items-center gap-0.5"
                                  >
                                    👁️ {t("Show", "Показ")}
                                  </button>

                                  <input
                                    id={`replace-news-file-${index}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          const imgData = event.target?.result as string;
                                          setNewsList((prev) => {
                                            const updated = [...prev];
                                            updated[index] = {
                                              ...updated[index],
                                              coverImg: imgData
                                            };
                                            return updated;
                                          });
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      document.getElementById(`replace-news-file-${index}`)?.click();
                                    }}
                                    className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer bg-none border-none outline-none flex items-center gap-0.5"
                                  >
                                    🔄 {t("Replace", "Заменить")}
                                  </button>
                                </div>

                                {deleteConfirmIdx === index ? (
                                  <div className="flex items-center gap-1.5 font-bold font-mono text-[9px]">
                                    <span className="text-neutral-400 pr-0.5">{t("Sure?", "Точно?")}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedList = newsList.filter((_, idx) => idx !== index);
                                        setNewsList(updatedList);
                                        setDeleteConfirmIdx(null);
                                        setCurrentNewsIndex((prevIdx) => {
                                          if (prevIdx >= updatedList.length) return Math.max(0, updatedList.length - 1);
                                          return prevIdx;
                                        });
                                      }}
                                      className="text-red-400 hover:text-red-300 cursor-pointer"
                                    >
                                      ✅ {t("Yes", "Да")}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmIdx(null)}
                                      className="text-neutral-400 hover:text-neutral-200 cursor-pointer"
                                    >
                                      ❌ {t("No", "Нет")}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={newsList.length <= 1}
                                    onClick={() => {
                                      setDeleteConfirmIdx(index);
                                    }}
                                    className="text-red-400 hover:text-red-300 font-bold disabled:opacity-30 cursor-pointer bg-none border-none outline-none"
                                  >
                                    🗑️ {t("Remove", "Удалить")}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Additional system controls */}
                <div className="bg-[#1E1E1E] border border-white/5 p-5 rounded-3xl space-y-3 text-left">
                  <h4 className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-widest">{t("DEVELEOPER SANDBOX STATE", "ПЕСОЧНИЦА РАЗРАБОТЧИКА")}</h4>
                  <p className="text-[10.5px] font-sans text-neutral-400 leading-relaxed">
                    {t("You are authenticated via custom project metadata rules as General Administrator. Any listings you approve are instantly fully operational with market chart generators, mock buys/sells matching, and smart contract validators.", "Вы авторизованы как главный администратор. Все одобренные вами заявки мгновенно активируются, генерируя котировки графиков, симуляцию торгов и валидацию смарт-контрактов.")}
                  </p>
                </div>
              </div>
              )
            )}
          </div>
        )}

      </main>

      {/* FOUR TABS MAIN NAVIGATION BAR */}
      <nav 
        id="app-navigation-bar" 
        className="fixed bottom-5 left-1/2 -translate-x-1/2 h-[40px] liquid-glass-nav rounded-2xl z-50 flex items-center justify-center gap-1.5 px-3"
      >
        {/* Tab 1: Market */}
        <button
          onClick={() => {
            setActiveTab("market");
            setStagedChannel(null);
          }}
          className={`flex items-center justify-center transition-all duration-300 focus:outline-none w-10 h-8 rounded-lg ${
            activeTab === "market" && !stagedChannel
              ? "text-white"
              : "text-white/20 hover:text-white/40"
          }`}
        >
          <Building className="w-[18px] h-[18px]" />
        </button>

        {/* Tab 2: Wallet */}
        <button
          onClick={() => {
            setActiveTab("portfolio");
            setStagedChannel(null);
          }}
          className={`flex items-center justify-center transition-all duration-300 focus:outline-none w-10 h-8 rounded-lg ${
            activeTab === "portfolio"
              ? "text-white"
              : "text-white/20 hover:text-white/40"
          }`}
          title={t("Wallet", "Кошелек")}
        >
          <Wallet className="w-[18px] h-[18px]" />
        </button>

        {/* Tab 3: Profile */}
        <button
          onClick={() => {
            setActiveTab("profile");
            setStagedChannel(null);
          }}
          className={`flex items-center justify-center transition-all duration-300 focus:outline-none w-10 h-8 rounded-lg ${
            (activeTab === "profile" || activeTab === "contracts" || activeTab === "settings" || activeTab === "tda")
              ? "text-white"
              : "text-white/20 hover:text-white/40"
          }`}
        >
          <User className="w-[18px] h-[18px]" />
        </button>

        {/* Tab 4: Admin Panel */}
        {isAdmin && (
          <button
            onClick={() => {
              setActiveTab("admin");
              setStagedChannel(null);
            }}
            className={`flex items-center justify-center transition-all duration-300 focus:outline-none w-10 h-8 rounded-lg ${
              activeTab === "admin"
                ? "text-white"
                : "text-white/20 hover:text-white/40"
            }`}
            title={t("Chief Moderator Panel", "Панель администратора")}
          >
            <Shield className="w-[18px] h-[18px]" />
          </button>
        )}
      </nav>



    </div>
  );
}
