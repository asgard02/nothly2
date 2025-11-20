"use client"

import React, { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeHighlight from "rehype-highlight"
import rehypeKatex from "rehype-katex"

// Fonction pour échapper les ### qui ne sont pas en début de ligne
function escapeInlineHeadings(content: string): string {
  return content.replace(/([^\n])###/g, "$1\\###")
}

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

    // Ajoute le style KaTeX pour les maths
    const katexLink = document.createElement("link")
    katexLink.id = "katex-style"
    katexLink.rel = "stylesheet"
    katexLink.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
    document.head.appendChild(katexLink)

    return () => {
      const linkToRemove = document.getElementById("highlight-theme")
      if (linkToRemove) {
        linkToRemove.remove()
      }
      const katexToRemove = document.getElementById("katex-style")
      if (katexToRemove) {
        katexToRemove.remove()
      }
    }
  }, [theme, resolvedTheme])

  // Échapper le contenu avant de le rendre
  const escapedContent = escapeInlineHeadings(content)

  return (
    <div 
      className="prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none leading-relaxed"
      onDragStart={(e) => e.preventDefault()}
      onDrag={(e) => e.preventDefault()}
      draggable={false}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        touchAction: "none"
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={{
          // Style personnalisé pour les blocs de code
          code({ node, inline, className, children, ...props }: any) {
            // Si c'est un élément math (géré par KaTeX), ne pas le wrapper
            const isMath = className?.includes('language-math') || className?.includes('math-inline') || className?.includes('math-display')
            if (isMath) {
              return <code className={className} {...props}>{children}</code>
            }

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
        {escapedContent}
      </ReactMarkdown>
    </div>
  )
}

