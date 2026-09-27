alter table learning_resources
    drop constraint ck_learning_resource_source;

alter table learning_resources
    add constraint ck_learning_resource_source
        check (source_type in (
            'MANUAL', 'AI', 'TEMPLATE', 'TEXT', 'MARKDOWN', 'FILE', 'URL', 'NOTION'
        ));
