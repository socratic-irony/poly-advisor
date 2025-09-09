interface MarkdownProps {
  children: string;
  components?: {
    a?: any;
    p?: any;
    ul?: any;
    ol?: any;
    li?: any;
    h1?: any;
    h2?: any;
    h3?: any;
    strong?: any;
    em?: any;
    code?: any;
    pre?: any;
    blockquote?: any;
  };
}

export default function SimpleMarkdown({ children, components = {} }: MarkdownProps) {
  // Split content into blocks (paragraphs, lists, etc.)
  const lines = children.split('\n');
  const blocks: string[] = [];
  let currentBlock = '';
  
  for (const line of lines) {
    if (line.trim() === '') {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = '';
      }
    } else {
      currentBlock += (currentBlock ? '\n' : '') + line;
    }
  }
  
  if (currentBlock) {
    blocks.push(currentBlock);
  }

  const parseInlineElements = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Combined regex for all inline elements: links, bold, italic, code
    const inlineRegex = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
    let match;
    
    while ((match = inlineRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      
      if (match[1]) { // Link [text](url)
        const linkComponent = components.a || ((props: any) => <a {...props} />);
        parts.push(
          linkComponent({
            key: match.index,
            href: match[3],
            children: match[2],
            target: "_blank",
            rel: "noopener noreferrer",
            className: "text-cal-poly-primary hover:text-cal-poly-green-light underline break-words"
          })
        );
      } else if (match[4]) { // Bold **text**
        const strongComponent = components.strong || ((props: any) => <strong {...props} />);
        parts.push(
          strongComponent({
            key: match.index,
            children: match[5],
            className: "font-semibold text-cal-poly-gray-dark"
          })
        );
      } else if (match[6]) { // Italic *text*
        const emComponent = components.em || ((props: any) => <em {...props} />);
        parts.push(
          emComponent({
            key: match.index,
            children: match[7],
            className: "italic"
          })
        );
      } else if (match[8]) { // Code `text`
        const codeComponent = components.code || ((props: any) => <code {...props} />);
        parts.push(
          codeComponent({
            key: match.index,
            children: match[9],
            className: "bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs sm:text-sm font-mono break-words"
          })
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts.length ? parts : [text];
  };

  const renderBlock = (block: string, index: number): React.ReactNode => {
    const trimmed = block.trim();
    
    // Headers
    if (trimmed.startsWith('# ')) {
      const content = trimmed.slice(2);
      const h1Component = components.h1 || ((props: any) => <h1 {...props} />);
      return h1Component({
        key: index,
        children: parseInlineElements(content),
        className: "text-xl sm:text-2xl font-bold text-cal-poly-primary mb-3 sm:mb-4 mt-4 sm:mt-6 first:mt-0"
      });
    }
    
    if (trimmed.startsWith('## ')) {
      const content = trimmed.slice(3);
      const h2Component = components.h2 || ((props: any) => <h2 {...props} />);
      return h2Component({
        key: index,
        children: parseInlineElements(content),
        className: "text-lg sm:text-xl font-semibold text-cal-poly-primary mb-2 sm:mb-3 mt-3 sm:mt-5 first:mt-0"
      });
    }
    
    if (trimmed.startsWith('### ')) {
      const content = trimmed.slice(4);
      const h3Component = components.h3 || ((props: any) => <h3 {...props} />);
      return h3Component({
        key: index,
        children: parseInlineElements(content),
        className: "text-base sm:text-lg font-semibold text-cal-poly-primary mb-2 sm:mb-3 mt-3 sm:mt-4 first:mt-0"
      });
    }
    
    // Code blocks
    if (trimmed.startsWith('```')) {
      const lines = trimmed.split('\n');
      const code = lines.slice(1, -1).join('\n');
      const preComponent = components.pre || ((props: any) => <pre {...props} />);
      return preComponent({
        key: index,
        children: code,
        className: "bg-gray-100 text-gray-800 p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-mono overflow-x-auto mb-2 sm:mb-3"
      });
    }
    
    // Blockquotes
    if (trimmed.startsWith('> ')) {
      const content = trimmed.replace(/^> /gm, '');
      const blockquoteComponent = components.blockquote || ((props: any) => <blockquote {...props} />);
      return blockquoteComponent({
        key: index,
        children: parseInlineElements(content),
        className: "border-l-4 border-cal-poly-primary pl-3 sm:pl-4 py-2 bg-gray-50 mb-2 sm:mb-3 italic"
      });
    }
    
    // Unordered lists
    if (trimmed.includes('\n-') || trimmed.startsWith('-')) {
      const items = trimmed.split('\n').filter(line => line.trim().startsWith('-'));
      const ulComponent = components.ul || ((props: any) => <ul {...props} />);
      const liComponent = components.li || ((props: any) => <li {...props} />);
      
      return ulComponent({
        key: index,
        className: "list-disc ml-4 sm:ml-6 mb-2 sm:mb-3 space-y-1",
        children: items.map((item, i) => {
          const content = item.trim().slice(1).trim();
          return liComponent({
            key: i,
            className: "leading-relaxed",
            children: parseInlineElements(content)
          });
        })
      });
    }
    
    // Ordered lists
    if (/^\d+\./.test(trimmed) || trimmed.includes('\n1.')) {
      const items = trimmed.split('\n').filter(line => /^\d+\./.test(line.trim()));
      const olComponent = components.ol || ((props: any) => <ol {...props} />);
      const liComponent = components.li || ((props: any) => <li {...props} />);
      
      return olComponent({
        key: index,
        className: "list-decimal ml-4 sm:ml-6 mb-2 sm:mb-3 space-y-1",
        children: items.map((item, i) => {
          const content = item.trim().replace(/^\d+\.\s*/, '');
          return liComponent({
            key: i,
            className: "leading-relaxed",
            children: parseInlineElements(content)
          });
        })
      });
    }
    
    // Regular paragraphs
    const pComponent = components.p || ((props: any) => <p {...props} />);
    return pComponent({
      key: index,
      className: "mb-2 sm:mb-3 last:mb-0",
      children: parseInlineElements(trimmed)
    });
  };

  return (
    <div>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}