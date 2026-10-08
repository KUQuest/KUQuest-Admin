import { apiRequest } from "../../../lib/api/client";
import { encode, queryString } from "./admin-api-transport";
import type {
  AdminApiRequestOptions,
  AdminMemberCertificates,
  AdminMemberWorkExperiences,
  AdminMemberHistory,
  AdminMemberHistoryQuery,
  AdminMemberPenaltyHistory,
  AdminMemberProfileCollectionQuery,
  AdminMemberProfileTags,
  AdminMemberReviews,
} from "./admin-api";

export function createAdminMemberProfileApi() {
  return {
    getMemberProfileTags(
      memberId: string,
      options: AdminApiRequestOptions = {},
    ): Promise<AdminMemberProfileTags> {
      return apiRequest<AdminMemberProfileTags>(
        `/api/v1/admin/members/${encode(memberId)}/profile-tags`,
        { cache: "no-store", ...options },
      );
    },

    listMemberWorkExperiences(
      memberId: string,
      query: AdminMemberProfileCollectionQuery = {},
      options: AdminApiRequestOptions = {},
    ): Promise<AdminMemberWorkExperiences> {
      return apiRequest<AdminMemberWorkExperiences>(
        `/api/v1/admin/members/${encode(memberId)}/work-experiences${queryString(query)}`,
        { cache: "no-store", ...options },
      );
    },

    listMemberCertificates(
      memberId: string,
      query: AdminMemberProfileCollectionQuery = {},
      options: AdminApiRequestOptions = {},
    ): Promise<AdminMemberCertificates> {
      return apiRequest<AdminMemberCertificates>(
        `/api/v1/admin/members/${encode(memberId)}/certificates${queryString(query)}`,
        { cache: "no-store", ...options },
      );
    },

    listMemberHistory(
      memberId: string,
      query: AdminMemberHistoryQuery = {},
      options: AdminApiRequestOptions = {},
    ): Promise<AdminMemberHistory> {
      return apiRequest<AdminMemberHistory>(
        `/api/v1/admin/members/${encode(memberId)}/history${queryString(query)}`,
        { cache: "no-store", ...options },
      );
    },

    listMemberReviews(
      memberId: string,
      query: AdminMemberProfileCollectionQuery = {},
      options: AdminApiRequestOptions = {},
    ): Promise<AdminMemberReviews> {
      return apiRequest<AdminMemberReviews>(
        `/api/v1/admin/members/${encode(memberId)}/reviews${queryString(query)}`,
        { cache: "no-store", ...options },
      );
    },

    listMemberPenaltyHistory(
      memberId: string,
      query: AdminMemberProfileCollectionQuery = {},
      options: AdminApiRequestOptions = {},
    ): Promise<AdminMemberPenaltyHistory> {
      return apiRequest<AdminMemberPenaltyHistory>(
        `/api/v1/admin/members/${encode(memberId)}/penalty-history${queryString(query)}`,
        { cache: "no-store", ...options },
      );
    },
  };
}
