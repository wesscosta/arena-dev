alter table word_cloud_rounds
    alter column max_words_per_participant type integer
    using max_words_per_participant::integer;
