"use client";

import { useStore } from "@/lib/store";
import LoginScreen from "@/components/LoginScreen";
import FeedView from "@/components/FeedView";
import ArticleView from "@/components/ArticleView";

export default function Home() {
  const { isConnected, activeArticle, isSpeedReading } = useStore();

  if (!isConnected) {
    return <LoginScreen />;
  }

  if (activeArticle || isSpeedReading) {
    return <ArticleView />;
  }

  return <FeedView />;
}
