-- Point app_config model keys at OpenAI ids (runtime Edge uses MODEL_* secrets; this keeps DB defaults aligned).
update public.app_config
set value = '"gpt-4o-mini"'::jsonb
where key = 'model.fast';

update public.app_config
set value = '"gpt-4o"'::jsonb
where key = 'model.quality';
