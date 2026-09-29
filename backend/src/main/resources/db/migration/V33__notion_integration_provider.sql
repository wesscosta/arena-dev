-- Arena Dev v0.8 / 16.3.8.7F — allow Notion OAuth connections in Integration Core.
alter table integration_connections drop constraint if exists ck_integration_connections_provider;
alter table integration_connections add constraint ck_integration_connections_provider
    check (provider in ('MICROSOFT_TEAMS', 'GOOGLE_CLASSROOM', 'NOTION'));
