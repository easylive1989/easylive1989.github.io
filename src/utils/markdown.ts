import type { Article } from '../types';

export function processMarkdownContent(content: string, article: Article, isTutorial: boolean = false, seriesName?: string): string {
    let processedContent = content;

    // Process image paths
    if (isTutorial && seriesName) {
        // Tutorial series articles
        processedContent = processedContent.replace(
            /!\[([^\]]*)\]\(([^)]+)\)/g,
            (match, alt, url) => {
                if (!url.startsWith('http') && !url.startsWith('/')) {
                    const decodedUrl = decodeURIComponent(url);
                    const filename = decodedUrl.split('/').pop();
                    if (filename) {
                        const newUrl = `/static/tutorials/${encodeURIComponent(seriesName)}/${encodeURIComponent(article.folderName)}/${encodeURIComponent(filename)}`;
                        return `![${alt}](${newUrl})`;
                    }
                }
                return match;
            }
        );
    } else {
        // Daily articles
        processedContent = processedContent.replace(
            /!\[([^\]]*)\]\(([^)]+)\)/g,
            (match, alt, url) => {
                if (!url.startsWith('http') && !url.startsWith('/')) {
                    const decodedUrl = decodeURIComponent(url);
                    const filename = decodedUrl.split('/').pop();
                    if (filename) {
                        const newUrl = `/static/artcles/${encodeURIComponent(article.folderName)}/${encodeURIComponent(filename)}`;
                        return `![${alt}](${newUrl})`;
                    }
                }
                return match;
            }
        );
    }

    // Process DartPad links
    processedContent = processedContent.replace(
        /\[https:\/\/dartpad\.dev\/\?id=([^\]]+)\]\(https:\/\/dartpad\.dev\/\?id=([^\)]+)\)/g,
        (_match, id1) => {
            const dartpadId = id1;
            return `<div class="dartpad-container"><iframe src="https://dartpad.dev/embed-flutter.html?id=${dartpadId}"></iframe></div>`;
        }
    );

    // Process video links
    processedContent = processedContent.replace(
        /\[([^\]]*\.mov)\]\(([^)]+)\)/g,
        (_match, _filename, url) => {
            if (!url.startsWith('http') && !url.startsWith('/')) {
                const decodedUrl = decodeURIComponent(url);
                const videoFilename = decodedUrl.split('/').pop();

                if (videoFilename) {
                    let videoUrl;
                    if (isTutorial && seriesName) {
                        videoUrl = `/static/tutorials/${encodeURIComponent(seriesName)}/${encodeURIComponent(article.folderName)}/${encodeURIComponent(videoFilename)}`;
                    } else {
                        videoUrl = `/static/artcles/${encodeURIComponent(article.folderName)}/${encodeURIComponent(videoFilename)}`;
                    }

                    return `<video src="${videoUrl}" controls></video>`;
                }
            }
            return _match;
        }
    );

    return processedContent;
}

export function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    } catch (e) {
        return dateStr;
    }
}
