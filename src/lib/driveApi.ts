export type DriveAccountData = any[];
type DriveFolderResponse = [any[], string | null, any[]];
type DriveItemResponse = any[];
type DriveProtoItem = any[];

const DRIVE_API_KEY = 'AIzaSyD_InbmSFufIEps5UAt2NmB_3LvBH3Sz_8';
const DRIVE_CLIENT_VERSION = (window as any)._DRIVE_buildLabel;
const DRIVE_JSPB_EXTENSION =
  'W1szMDUsMCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCwxLG51bGwsbnVsbCxbMl1dXQ==';
const DRIVE_ITEM_JSPB_EXTENSION =
  'W1sxMDAxLDAsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsMSxudWxsLG51bGwsWzJdXV0=';
const DRIVE_ACCOUNT_URL = `https://drivefrontend-pa.clients6.google.com/v1/account?alt=protojson&fields=account.drive_for_desktop_settings.switchblade_psk%2Caccount.enterprise_settings.can_access_admin_console%2Caccount.enterprise_settings.is_dasher_admin%2Caccount.enterprise_settings.is_dasher_user%2Caccount.metadata.backend_diagnostics.backend%2Caccount.metadata.export_format%2Caccount.metadata.gsuite_subscription_info.status%2Caccount.metadata.gsuite_subscription_info.trial_end_time_millis%2Caccount.metadata.gsuite_subscription_info.trial_millis_remaining%2Caccount.metadata.import_format%2Caccount.metadata.max_upload_size%2Caccount.metadata.quota.bytes_limit%2Caccount.metadata.quota.bytes_remaining%2Caccount.metadata.quota.bytes_used_by_all_services%2Caccount.metadata.quota.bytes_used_by_team%2Caccount.metadata.quota.bytes_used_by_user%2Caccount.metadata.quota.bytes_used_in_drive_trash_by_user%2Caccount.metadata.quota.grace_period_info.active%2Caccount.metadata.quota.grace_period_info.additional_quota_bytes%2Caccount.metadata.quota.grace_period_info.end_timestamp_millis%2Caccount.metadata.quota.individual_bytes_limit%2Caccount.metadata.quota.individual_usage_state%2Caccount.metadata.quota.quota_bytes_total%2Caccount.metadata.quota.quota_bytes_used%2Caccount.metadata.quota.quota_bytes_used_aggregate%2Caccount.metadata.quota.quota_bytes_used_in_trash%2Caccount.metadata.quota.quota_status%2Caccount.metadata.quota.quota_type%2Caccount.metadata.quota.service_usage.bytes_used%2Caccount.metadata.quota.service_usage.service_key%2Caccount.metadata.quota.usage_state%2Caccount.metadata.root_folder_id%2Caccount.metadata.target_audiences.audience_id%2Caccount.metadata.target_audiences.display_name%2Caccount.metadata.team_dashboard_capabilities.can_administer_team%2Caccount.metadata.team_dashboard_capabilities.can_manage_invites%2Caccount.search_settings.can_display_zero_state_search%2Caccount.security_settings.is_cse_create_enabled%2Caccount.security_settings.is_cse_enabled%2Caccount.security_settings.is_cse_on_by_default%2Caccount.shared_drives_settings.can_create_shared_drives%2Caccount.shared_drives_settings.can_interact_with_shared_drives%2Caccount.shared_drives_settings.can_migrate_to_shared_drives_as_admin%2Caccount.shared_drives_settings.has_shared_drives%2Caccount.storage_settings.can_buy_storage%2Caccount.user.customer_id%2Caccount.user.domain%2Caccount.user.email%2Caccount.user.email_from_account%2Caccount.user.focus_user_id%2Caccount.user.id%2Caccount.user.photo_url%2Caccount.user.short_name%2Caccount.user_capabilities%2Caccount.user_pref%2Caccount.view_settings.can_display_suggestions_in_shared_with_me%2Caccount.view_settings.can_view_priority%2Caccount.view_settings.show_machine_root_view%2Caccount.view_settings.show_spam_view%2Caccount.workspace_settings.active_workspace_limit%2Caccount.workspace_settings.can_create_workspaces%2Caccount.workspace_settings.total_workspace_limit%2Caccount.workspace_settings.workspace_item_limit&key=${DRIVE_API_KEY}`;
const DRIVE_ITEMS_URL = `https://drivefrontend-pa.clients6.google.com/v1/items:list?key=${DRIVE_API_KEY}`;
const DRIVE_ITEM_URL = `https://drivefrontend-pa.clients6.google.com/v1/items:get?key=${DRIVE_API_KEY}`;
const DRIVE_FIELD_MASK =
  'items(parent,modified_date_millis,has_visitor_permissions,contains_unsubscribed_children,capabilities(can_move_item_into_team_drive,can_untrash,can_modify_content_restriction,can_move_item_within_team_drive,can_move_item_out_of_team_drive,can_delete_children,can_trash_children,can_request_approval,can_read_category_metadata,can_edit_category_metadata,can_add_my_drive_parent,can_remove_my_drive_parent,can_share_child_files,can_share_child_folders,can_read,can_move_item_within_drive,can_move_children_within_drive,can_add_folder_from_another_drive,can_change_security_update_enabled,can_create_decrypted_copy,can_create_encrypted_copy,can_add_encrypted_children,can_block_owner,can_report_spam_or_abuse,can_copy_encrypted_file,can_copy_non_authoritative,can_download_non_authoritative,can_report_not_spam,can_initiate_esignature,can_discover_by_search,can_copy,can_download,can_edit,can_add_children,can_delete,can_remove_children,can_share,can_trash,can_rename,can_list_children,can_read_team_drive,can_move_team_drive_item),modified_by_me_date_millis,last_viewed_by_me_date_millis,alternate_link,workspace_id,file_size,content_restrictions(read_only),approval_version,owner(id,focus_user_id,is_me,type,email),approval_summaries,shortcut_details(target_id,target_mime_type,target_lookup_status,target_item,can_request_access_to_target),last_modifying_user(id,focus_user_id,is_me,type,email),customer_id,ancestor_has_own_permissions,has_thumbnail,thumbnail_version,title,mime_type,image(width,height),id,resource_key,abuse_is_appealable,abuse_notice_reason,spam_metadata(marked_as_spam_date_millis,in_spam_view,is_spam,is_inherited_spam),shared,access_requests_count,has_incoming_approval,shared_with_me_date_millis,user_role,inheritance_broken,explicitly_trashed,quota_bytes_used,gmail_message_storage_id,applied_labels,has_catch_me_up_content,workflow_creation_id,vids_import_compatibility_info,workbook_details,subscribed,folder_color,has_child_folder,starred,creator_app_id,file_extension,primary_sync_parent,sharing_user(id,focus_user_id,is_me,type,email),flagged_for_abuse,folder_features,spaces,source_app_id,trashed,recency_date_millis,recency_date_reason,restricted,version,action_item,viewed,team_drive_id,has_own_permissions,create_date_millis,primary_domain_name,organization_display_name,passively_subscribed,trashing_user(id,focus_user_id,is_me,type,email),trashed_date_millis),continuation_token,search_response_metadata(incomplete_search,moonshine_item_ids,query_suggestions(spell_response,nlp_response))';
const DRIVE_ITEM_FIELD_MASK =
  'responses(status(code,message,details),item(parent,modified_date_millis,has_visitor_permissions,contains_unsubscribed_children,capabilities(can_move_item_into_team_drive,can_untrash,can_modify_content_restriction,can_move_item_within_team_drive,can_move_item_out_of_team_drive,can_delete_children,can_trash_children,can_request_approval,can_read_category_metadata,can_edit_category_metadata,can_add_my_drive_parent,can_remove_my_drive_parent,can_share_child_files,can_share_child_folders,can_read,can_move_item_within_drive,can_move_children_within_drive,can_add_folder_from_another_drive,can_change_security_update_enabled,can_create_decrypted_copy,can_create_encrypted_copy,can_add_encrypted_children,can_block_owner,can_report_spam_or_abuse,can_copy_encrypted_file,can_copy_non_authoritative,can_download_non_authoritative,can_report_not_spam,can_initiate_esignature,can_discover_by_search,can_copy,can_download,can_edit,can_add_children,can_delete,can_remove_children,can_share,can_trash,can_rename,can_list_children,can_read_team_drive,can_move_team_drive_item),modified_by_me_date_millis,last_viewed_by_me_date_millis,alternate_link,workspace_id,file_size,content_restrictions(read_only),approval_version,owner(id,focus_user_id,is_me,type,email),approval_summaries,shortcut_details(target_id,target_mime_type,target_lookup_status,target_item,can_request_access_to_target),last_modifying_user(id,focus_user_id,is_me,type,email),customer_id,ancestor_has_own_permissions,has_thumbnail,thumbnail_version,title,mime_type,id,resource_key,abuse_is_appealable,abuse_notice_reason,spam_metadata(marked_as_spam_date_millis,in_spam_view,is_spam,is_inherited_spam),shared,access_requests_count,has_incoming_approval,shared_with_me_date_millis,user_role,inheritance_broken,explicitly_trashed,quota_bytes_used,gmail_message_storage_id,applied_labels,has_catch_me_up_content,workflow_creation_id,vids_import_compatibility_info,workbook_details,subscribed,folder_color,has_child_folder,starred,creator_app_id,file_extension,primary_sync_parent,sharing_user(id,focus_user_id,is_me,type,email),flagged_for_abuse,folder_features,spaces,source_app_id,trashed,recency_date_millis,recency_date_reason,restricted,version,action_item,viewed,team_drive_id,has_own_permissions,create_date_millis,primary_domain_name,organization_display_name,passively_subscribed,trashing_user(id,focus_user_id,is_me,type,email),trashed_date_millis,permission_summary))';
const DRIVE_ACCEPT_LANGUAGE = 'vi';
const DRIVE_ORIGIN = 'https://drive.google.com';

type SapisidContext = Record<string, string | number> | null;

export type DriveFolderDetails = {
  title: string;
  ownerEmail: string;
  thumbnailUrl: string | null;
};

async function getSapisidHash(timestamp: number, context: SapisidContext) {
  const sapisid = document.cookie.match(/SAPISID=([^;]+)/)?.[1];
  if (!sapisid) {
    throw new Error('SAPISID cookie not found. Are you logged in?');
  }

  const contextKeys = context ? Object.keys(context) : [];
  const contextValues = context ? Object.values(context) : [];
  const rawString = (
    contextValues.length === 0
      ? [timestamp, sapisid, DRIVE_ORIGIN]
      : [contextValues.join(':'), timestamp, sapisid, DRIVE_ORIGIN]
  ).join(' ');

  const encoder = new TextEncoder();
  const data = encoder.encode(rawString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const hashValue = (
    contextKeys.length === 0
      ? [timestamp, hashHex]
      : [timestamp, hashHex, contextKeys.join('')]
  ).join('_');

  return `SAPISIDHASH ${hashValue} SAPISID1PHASH ${hashValue} SAPISID3PHASH ${hashValue}`;
}

export function getAuthUser() {
  const match = window.location.href.match(/\/u\/(\d+)/);
  return match ? match[1] : '0';
}

function createDriveHeaders(
  authUser: string,
  authorization: string,
  extraHeaders: Record<string, string> = {},
) {
  return {
    accept: '*/*',
    'accept-language': DRIVE_ACCEPT_LANGUAGE,
    authorization,
    'cache-control': 'no-cache',
    'content-type': 'application/json+protobuf',
    pragma: 'no-cache',
    'x-goog-authuser': authUser,
    'x-goog-drive-client-version': DRIVE_CLIENT_VERSION,
    'x-goog-ext-472780938-jspb': DRIVE_JSPB_EXTENSION,
    ...extraHeaders,
  };
}

function requestProtoJson<TResponse>({
  authUser,
  body,
  headers,
  method,
  url,
}: {
  authUser: string;
  body?: Document | XMLHttpRequestBodyInit | null;
  headers?: Record<string, string>;
  method: 'GET' | 'POST';
  url: string;
}) {
  return new Promise<TResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.withCredentials = true;

    Object.entries(headers ?? {}).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Request failed with status ${xhr.status}`));
        return;
      }

      try {
        resolve(JSON.parse(xhr.responseText) as TResponse);
      } catch (error) {
        reject(error);
      }
    };

    xhr.onerror = () =>
      reject(
        new Error(
          `Network error while requesting Google Drive data for auth user ${authUser}`,
        ),
      );

    xhr.send(body);
  });
}

function buildFolderItemsBody(folderId: string, cursor?: string) {
  return `[[null,null,null,null,0,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"",null,0,null,null,[4,1,1],null,null,null,null,null,null,null,null,null,null,[[1]],null,null,null,null,null,null,null,[["${folderId}"]]],[50,"${cursor ?? ''}",[2,5]]]`;
}

function buildFolderDetailsBody(folderId: string) {
  return `[["${folderId}"],[null,null,null,null,null,[2,5]]]`;
}

function isDriveProtoItem(value: unknown): value is DriveProtoItem {
  return (
    Array.isArray(value) &&
    typeof value[0] === 'string' &&
    value[0].length > 0 &&
    typeof value[2] === 'string' &&
    value[2].length > 0 &&
    typeof value[3] === 'string' &&
    value[3].length > 0
  );
}

function extractDriveProtoItem(
  response: DriveItemResponse,
): DriveProtoItem | null {
  const responses = Array.isArray(response[0]) ? response[0] : [];

  for (const entry of responses) {
    if (!Array.isArray(entry)) {
      continue;
    }

    for (const candidate of entry) {
      if (isDriveProtoItem(candidate)) {
        return candidate;
      }
    }
  }

  for (const candidate of response) {
    if (isDriveProtoItem(candidate)) {
      return candidate;
    }
  }

  return null;
}

function findEmailValue(value: unknown): string {
  if (typeof value === 'string' && value.includes('@')) {
    return value;
  }

  if (!Array.isArray(value)) {
    return '';
  }

  for (const entry of value) {
    const email = findEmailValue(entry);
    if (email) {
      return email;
    }
  }

  return '';
}

function findThumbnailVersion(item: DriveProtoItem): string {
  for (let index = 0; index < item.length - 1; index += 1) {
    if (item[index] !== true) {
      continue;
    }

    const candidate = item[index + 1];
    if (
      typeof candidate === 'number' &&
      Number.isFinite(candidate) &&
      candidate > 0
    ) {
      return String(candidate);
    }

    if (
      typeof candidate === 'string' &&
      /^\d+$/.test(candidate) &&
      candidate !== '0'
    ) {
      return candidate;
    }
  }

  return '';
}

export async function fetchAccount(
  authUser = getAuthUser(),
): Promise<DriveAccountData> {
  const timestamp = Math.floor(Date.now() / 1000);
  const authorization = await getSapisidHash(timestamp, null);

  return requestProtoJson<DriveAccountData>({
    authUser,
    headers: createDriveHeaders(authUser, authorization),
    method: 'GET',
    url: DRIVE_ACCOUNT_URL,
  });
}

export async function fetchFolderItems(
  folderId: string,
  cursor?: string,
  accountData?: DriveAccountData,
  authUser = getAuthUser(),
): Promise<DriveFolderResponse> {
  const userInfo = accountData ?? (await fetchAccount(authUser));
  const timestamp = Math.floor(Date.now() / 1000);
  const authorization = await getSapisidHash(timestamp, {
    u: userInfo[0][0][10],
  });

  return requestProtoJson<DriveFolderResponse>({
    authUser,
    body: buildFolderItemsBody(folderId, cursor),
    headers: createDriveHeaders(authUser, authorization, {
      'x-goog-fieldmask': DRIVE_FIELD_MASK,
    }),
    method: 'POST',
    url: DRIVE_ITEMS_URL,
  });
}

export async function fetchFolderDetails(
  folderId: string,
  accountData?: DriveAccountData,
  authUser = getAuthUser(),
): Promise<DriveFolderDetails> {
  const userInfo = accountData ?? (await fetchAccount(authUser));
  const timestamp = Math.floor(Date.now() / 1000);
  const authorization = await getSapisidHash(timestamp, {
    u: userInfo[0][0][10],
  });
  const response = await requestProtoJson<DriveItemResponse>({
    authUser,
    body: buildFolderDetailsBody(folderId),
    headers: createDriveHeaders(authUser, authorization, {
      'x-goog-ext-472780938-jspb': DRIVE_ITEM_JSPB_EXTENSION,
      'x-goog-fieldmask': DRIVE_ITEM_FIELD_MASK,
    }),
    method: 'POST',
    url: DRIVE_ITEM_URL,
  });
  const item = extractDriveProtoItem(response);

  if (!item) {
    throw new Error('Failed to parse Google Drive folder details');
  }

  const owner = Array.isArray(item[16]) ? item[16] : null;
  const thumbnailVersion = findThumbnailVersion(item);

  return {
    ownerEmail: owner ? findEmailValue(owner) || 'Unknown' : 'Unknown',
    thumbnailUrl: thumbnailVersion
      ? `https://lh3.google.com/u/${authUser}/d/${folderId}=s220`
      : null,
    title:
      typeof item[2] === 'string' && item[2].length > 0 ? item[2] : 'Untitled',
  };
}
