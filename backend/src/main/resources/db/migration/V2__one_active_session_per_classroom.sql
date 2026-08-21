create unique index uk_class_sessions_one_active_per_classroom
    on class_sessions(classroom_id)
    where status = 'ACTIVE';
