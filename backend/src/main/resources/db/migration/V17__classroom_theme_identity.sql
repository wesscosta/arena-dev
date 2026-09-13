alter table classrooms
    add column theme_color varchar(20) not null default 'emerald',
    add column theme_icon varchar(20) not null default 'code';

alter table classrooms
    add constraint ck_classrooms_theme_color
    check (theme_color in ('emerald', 'teal', 'blue', 'indigo', 'violet', 'amber', 'orange', 'rose'));

alter table classrooms
    add constraint ck_classrooms_theme_icon
    check (theme_icon in ('code', 'terminal', 'database', 'network', 'computer', 'project', 'business', 'math'));
