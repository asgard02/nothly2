"use client"

import React, { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

export default function MarkdownRenderer({ content }: { content: string }) {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  // Évite les problèmes d'hydratation et charge le bon thème
  useEffect(() => {
    setMounted(true)
    
    // Charge le style highlight.js selon le thème
    const isDark = resolvedTheme === "dark" || theme === "dark"
    
    // Supprime les anciens styles si présents
    const existingLink = document.getElementById("highlight-theme")
    if (existingLink) {
      existingLink.remove()
    }
    
    // Ajoute le style approprié
    const link = document.createElement("link")
    link.id = "highlight-theme"
    link.rel = "stylesheet"
    link.href = isDark
      ? "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/styles/github-dark.min.css"
      : "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/styles/github.min.css"
    document.head.appendChild(link)
    
    return () => {
      const linkToRemove = document.getElementById("highlight-theme")
      if (linkToRemove) {
        linkToRemove.remove()
      }
    }
  }, [theme, resolvedTheme])

  return (
    <div className="prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Style personnalisé pour les blocs de code
          code({ node, inline, className, children, ...props }: any) {
            return !inline ? (
              <pre className="bg-muted text-foreground p-3 rounded-lg overflow-x-auto border border-border">
                <code {...props}>{children}</code>
              </pre>
            ) : (
              <code className="bg-muted text-foreground px-1 py-0.5 rounded">{children}</code>
            )
          },
          // Pour les liens
          a({ href, children }) {
            return (
              <a
                href={href as string}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {children}
              </a>
            )
          },
          // Pour les listes
          li({ children }) {
            return <li className="ml-4 list-disc">{children}</li>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

