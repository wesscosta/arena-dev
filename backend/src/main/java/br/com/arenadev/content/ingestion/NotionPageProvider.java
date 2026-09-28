package br.com.arenadev.content.ingestion;

import java.util.List;

/** Authorized infrastructure boundary for reading a Notion page snapshot. */
public interface NotionPageProvider {
    boolean isConfigured();
    NotionPageSnapshot fetch(String pageId);

    record NotionPageSnapshot(String pageId, String title, List<NotionBlock> blocks) {
        public NotionPageSnapshot { blocks = blocks == null ? List.of() : List.copyOf(blocks); }
    }
    record NotionBlock(String id, String type, int headingLevel, String text) {}
}
