'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ManualGuideLink } from '@/components/ManualGuide';

interface ParsedSegment {
    type: 'text' | 'guide';
    content?: string;
    pageNumber?: number;
    caption?: string;
}

// Hoisted outside component — never recreated (react-best-practices: hoist RegExp)
const GUIDE_REGEX = /\[\[GUIDE:(\d+):([^\]]+)\]\]/g;

export function parseGuideReferences(text: string): ParsedSegment[] {
    const segments: ParsedSegment[] = [];
    let lastIndex = 0;

    // Reset regex state before each use
    GUIDE_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = GUIDE_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
        }
        segments.push({
            type: 'guide',
            pageNumber: parseInt(match[1], 10),
            caption: match[2],
        });
        lastIndex = GUIDE_REGEX.lastIndex;
    }

    if (lastIndex < text.length) {
        segments.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return segments;
}

interface MessageContentProps {
    content: string;
    onOpenModal: (page: number, caption: string) => void;
}

export function MessageContent({ content, onOpenModal }: MessageContentProps) {
    const segments = parseGuideReferences(content);

    // Fast path: no GUIDE references
    if (segments.length === 1 && segments[0].type === 'text') {
        return <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown>;
    }

    return (
        <>
            {segments.map((seg, i) =>
                seg.type === 'text' ? (
                    <ReactMarkdown key={i} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {seg.content ?? ''}
                    </ReactMarkdown>
                ) : (
                    <ManualGuideLink
                        key={i}
                        pageNumber={seg.pageNumber!}
                        caption={seg.caption!}
                        onOpenModal={onOpenModal}
                    />
                )
            )}
        </>
    );
}
