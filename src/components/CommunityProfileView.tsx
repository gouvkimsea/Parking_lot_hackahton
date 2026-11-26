import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Flag,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type {
  CommunityFeedbackReport,
  CommunityParkingSubmission,
  CommunityReview,
  CommunityUser,
  SubmissionStatus,
} from '../types/parking';
import {
  canUserEditSubmission,
  countUserContributions,
} from '../utils/communityLogic';
import { FACILITY_TYPE_LABELS, formatKhr } from '../utils/parkingLogic';

interface CommunityProfileViewProps {
  currentUser: CommunityUser | null;
  submissions: CommunityParkingSubmission[];
  reviews: CommunityReview[];
  reports: CommunityFeedbackReport[];
  onOpenAuth: (reason?: string) => void;
  onLogout: () => void;
  onRequestAddParking: () => void;
  onEditSubmission: (submission: CommunityParkingSubmission) => void;
  onOpenLotOnMap: (lotId: string) => void;
  onModerateSubmission: (
    submissionId: string,
    status: SubmissionStatus,
    note?: string
  ) => void;
  onDeleteSubmission: (submissionId: string) => void;
  onResolveReport: (
    reportId: string,
    resolution: 'resolved' | 'dismissed'
  ) => void;
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#047857]">
        <CheckCircle2 className="w-3 h-3" />
        Approved
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFBEB] text-[#B45309]">
        Pending Review
      </span>
    );
  }
  if (status === 'flagged') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700">
        <Flag className="w-3 h-3" />
        Flagged
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700">
      <XCircle className="w-3 h-3" />
      Rejected
    </span>
  );
}

export const CommunityProfileView: React.FC<CommunityProfileViewProps> = ({
  currentUser,
  submissions,
  reviews,
  reports,
  onOpenAuth,
  onLogout,
  onRequestAddParking,
  onEditSubmission,
  onOpenLotOnMap,
  onModerateSubmission,
  onDeleteSubmission,
  onResolveReport,
}) => {
  const [sectionTab, setSectionTab] = useState<
    'submissions' | 'reviews' | 'reports' | 'admin'
  >('submissions');
  const [adminFilter, setAdminFilter] = useState<
    SubmissionStatus | 'reports'
  >('pending');
  const [moderationNotes, setModerationNotes] = useState<Record<string, string>>(
    {}
  );

  const stats = useMemo(() => {
    if (!currentUser) return null;
    return countUserContributions(currentUser.id, submissions, reviews, reports);
  }, [currentUser, submissions, reviews, reports]);

  const userSubmissions = useMemo(
    () =>
      currentUser
        ? submissions.filter((s) => s.submittedById === currentUser.id)
        : [],
    [currentUser, submissions]
  );

  const userReviews = useMemo(
    () =>
      currentUser ? reviews.filter((r) => r.userId === currentUser.id) : [],
    [currentUser, reviews]
  );

  const userReports = useMemo(
    () =>
      currentUser ? reports.filter((r) => r.userId === currentUser.id) : [],
    [currentUser, reports]
  );

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const flaggedCount = submissions.filter((s) => s.status === 'flagged').length;
  const openReportsCount = reports.filter((r) => r.status === 'open').length;

  const adminFilteredSubmissions = useMemo(
    () => submissions.filter((s) => s.status === adminFilter),
    [submissions, adminFilter]
  );

  const renderFeeSummary = (sub: CommunityParkingSubmission) => {
    if (sub.feeMode === 'free') return 'Free parking';
    const parts: string[] = [];
    if (sub.hourlyCarKhr !== null) parts.push(`Car ${formatKhr(sub.hourlyCarKhr)}/hr`);
    if (sub.hourlyMotoKhr !== null) parts.push(`Moto ${formatKhr(sub.hourlyMotoKhr)}`);
    if (sub.dailyKhr !== null) parts.push(`Daily ${formatKhr(sub.dailyKhr)}`);
    if (sub.monthlyCarKhr !== null) parts.push(`Monthly ${formatKhr(sub.monthlyCarKhr)}`);
    return parts.length > 0 ? parts.join(' · ') : 'Price unavailable';
  };

  if (!currentUser) {
    const approvedCount = submissions.filter((s) => s.status === 'approved').length;
    return (
      <section
        aria-label="Community Contributions"
        className="max-w-[1000px] mx-auto w-full px-3 sm:px-5 pt-3 md:pt-0 pb-28 md:pb-10"
      >
        <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-[0_14px_40px_rgba(20,21,23,0.06)] border border-black/[0.04] text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#F3FCE0] text-[#3F5A05] flex items-center justify-center mx-auto">
            <UserCheck className="w-7 h-7" />
          </div>
          <div className="max-w-lg mx-auto space-y-2">
            <h1 className="text-[22px] sm:text-[26px] font-extrabold tracking-[-0.02em] text-[#141517]">
              Phnom Penh Community Parking Hub
            </h1>
            <p className="text-[13.5px] text-[#525760] leading-relaxed">
              Sign in or register to submit missing Phnom Penh parking lots, upload entrance or fee-board photos, post star reviews, and track verification status.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="bg-[#F6F7F8] rounded-2xl p-3">
              <p className="text-[20px] font-extrabold text-[#141517] tabular-nums">
                {approvedCount}
              </p>
              <p className="text-[11px] font-semibold text-[#6B7280]">
                Community Lots Live
              </p>
            </div>
            <div className="bg-[#F6F7F8] rounded-2xl p-3">
              <p className="text-[20px] font-extrabold text-[#141517] tabular-nums">
                {reviews.length}
              </p>
              <p className="text-[11px] font-semibold text-[#6B7280]">
                Verified Reviews
              </p>
            </div>
            <div className="bg-[#F6F7F8] rounded-2xl p-3">
              <p className="text-[20px] font-extrabold text-[#141517] tabular-nums">
                {pendingCount}
              </p>
              <p className="text-[11px] font-semibold text-[#6B7280]">
                In Review Queue
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() =>
                onOpenAuth('Sign in or create an account to view your contribution profile.')
              }
              className="min-h-[46px] px-7 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[13.5px] font-bold transition-colors"
            >
              Sign In / Create Account
            </button>
            <button
              type="button"
              onClick={onRequestAddParking}
              className="min-h-[46px] px-6 rounded-full bg-[#141517] hover:bg-[#2A2D32] text-white text-[13.5px] font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4 text-[#C5EC45]" />
              <span>Add Parking</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="User Contribution Profile and Moderation"
      className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto w-full px-3 sm:px-5 lg:px-6 xl:px-8 pt-3 md:pt-0 pb-28 md:pb-10 space-y-5"
    >
      {/* Top Profile & Stats Card */}
      <div className="bg-white rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 shadow-[0_12px_36px_rgba(20,21,23,0.05)] border border-black/[0.04] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-14 h-14 rounded-full bg-[#141517] text-[#C5EC45] font-extrabold text-[19px] flex items-center justify-center shrink-0">
            {currentUser.name
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[19px] sm:text-[21px] font-extrabold text-[#141517] truncate">
                {currentUser.name}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  currentUser.role === 'admin'
                    ? 'bg-[#141517] text-[#C5EC45]'
                    : 'bg-[#E8F8B4] text-[#3F5A05]'
                }`}
              >
                {currentUser.role === 'admin' ? 'Admin Moderator' : 'Contributor'}
              </span>
            </div>
            <p className="text-[12.5px] text-[#767B84] truncate">
              {currentUser.email} · {stats?.total ?? 0} total contribution
              {stats?.total === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 mr-1">
            <span className="px-3 py-1.5 rounded-full bg-[#F6F7F8] text-[12px] font-semibold text-[#141517] tabular-nums">
              {stats?.approvedSubmissions ?? 0} Approved
            </span>
            <span className="px-3 py-1.5 rounded-full bg-[#FFFBEB] text-[12px] font-semibold text-[#B45309] tabular-nums">
              {stats?.pendingSubmissions ?? 0} Pending
            </span>
            <span className="px-3 py-1.5 rounded-full bg-[#F6F7F8] text-[12px] font-semibold text-[#141517] tabular-nums">
              {stats?.totalReviews ?? 0} Reviews
            </span>
          </div>

          <button
            type="button"
            onClick={onRequestAddParking}
            className="min-h-[42px] px-4 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[12.5px] font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Parking</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="min-h-[42px] px-4 rounded-full bg-[#F4F5F6] hover:bg-[#EAECEF] text-[#141517] text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSectionTab('submissions')}
          className={`min-h-[42px] px-4 rounded-full text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
            sectionTab === 'submissions'
              ? 'bg-[#141517] text-white'
              : 'bg-white text-[#525760] hover:text-[#141517] border border-black/[0.06]'
          }`}
        >
          My Submissions ({userSubmissions.length})
        </button>

        <button
          type="button"
          onClick={() => setSectionTab('reviews')}
          className={`min-h-[42px] px-4 rounded-full text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
            sectionTab === 'reviews'
              ? 'bg-[#141517] text-white'
              : 'bg-white text-[#525760] hover:text-[#141517] border border-black/[0.06]'
          }`}
        >
          My Reviews ({userReviews.length})
        </button>

        <button
          type="button"
          onClick={() => setSectionTab('reports')}
          className={`min-h-[42px] px-4 rounded-full text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
            sectionTab === 'reports'
              ? 'bg-[#141517] text-white'
              : 'bg-white text-[#525760] hover:text-[#141517] border border-black/[0.06]'
          }`}
        >
          My Feedback Reports ({userReports.length})
        </button>

        {currentUser.role === 'admin' && (
          <button
            type="button"
            data-testid="admin-moderation-tab"
            onClick={() => setSectionTab('admin')}
            className={`min-h-[42px] px-4 rounded-full text-[13px] font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors ${
              sectionTab === 'admin'
                ? 'bg-[#C5EC45] text-[#141517]'
                : 'bg-[#141517] text-[#C5EC45]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              Admin Moderation ({pendingCount + flaggedCount + openReportsCount})
            </span>
          </button>
        )}
      </div>

      {/* Tab 1: My Submissions */}
      {sectionTab === 'submissions' && (
        <div className="bg-white rounded-[24px] p-4 sm:p-6 shadow-[0_12px_36px_rgba(20,21,23,0.05)] border border-black/[0.04] space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-[17px] font-bold text-[#141517]">
              Submitted Parking Locations
            </h2>
            <span className="text-[12px] text-[#767B84]">
              Pending & flagged submissions can be edited anytime
            </span>
          </div>

          {userSubmissions.length === 0 ? (
            <div className="bg-[#F6F7F8] rounded-2xl p-6 text-center space-y-2.5">
              <MapPin className="w-6 h-6 text-[#767B84] mx-auto" />
              <p className="text-[14.5px] font-semibold text-[#141517]">
                You haven&apos;t submitted any parking spots yet
              </p>
              <button
                type="button"
                onClick={onRequestAddParking}
                className="min-h-[42px] px-5 rounded-full bg-[#C5EC45] text-[#141517] text-[12.5px] font-bold"
              >
                + Add Missing Parking
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {userSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-[#F6F7F8] rounded-[20px] p-4 space-y-2.5 border border-black/[0.04]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={sub.status} />
                        <span className="text-[11px] font-semibold text-[#525760]">
                          {FACILITY_TYPE_LABELS[sub.facilityType]}
                        </span>
                      </div>
                      <h3 className="text-[15.5px] font-bold text-[#141517] mt-1">
                        {sub.name}
                      </h3>
                      <p className="text-[12px] text-[#6B7280] truncate">
                        {sub.district} · {sub.address}
                      </p>
                    </div>
                  </div>

                  <p className="text-[12px] font-semibold text-[#141517]">
                    {renderFeeSummary(sub)}
                  </p>

                  {sub.moderationNote && (
                    <p className="text-[11.5px] bg-white rounded-xl p-2.5 text-[#525760] border border-black/5">
                      Moderator note: {sub.moderationNote}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-[#767B84]">
                      Submitted {sub.submittedAt.slice(0, 10)}
                    </span>
                    <div className="flex items-center gap-2">
                      {canUserEditSubmission(currentUser, sub) && (
                        <button
                          type="button"
                          onClick={() => onEditSubmission(sub)}
                          className="min-h-[36px] px-3 rounded-full bg-white hover:bg-[#EAECEF] text-[#141517] text-[12px] font-semibold inline-flex items-center gap-1 border border-black/10"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                      {sub.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => onDeleteSubmission(sub.id)}
                          aria-label={`Withdraw ${sub.name}`}
                          className="min-h-[36px] px-3 rounded-full bg-white hover:bg-red-50 text-[#6B7280] hover:text-red-700 text-[12px] font-semibold inline-flex items-center gap-1 border border-black/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Withdraw</span>
                        </button>
                      )}
                      {sub.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => onOpenLotOnMap(sub.id)}
                          className="min-h-[36px] px-3.5 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[12px] font-bold"
                        >
                          View on Map
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Reviews */}
      {sectionTab === 'reviews' && (
        <div className="bg-white rounded-[24px] p-4 sm:p-6 shadow-[0_12px_36px_rgba(20,21,23,0.05)] border border-black/[0.04] space-y-4">
          <h2 className="text-[17px] font-bold text-[#141517]">
            Written Parking Reviews ({userReviews.length})
          </h2>

          {userReviews.length === 0 ? (
            <div className="bg-[#F6F7F8] rounded-2xl p-6 text-center space-y-2">
              <MessageSquare className="w-6 h-6 text-[#767B84] mx-auto" />
              <p className="text-[14px] font-semibold text-[#141517]">
                No reviews written yet
              </p>
              <p className="text-[12.5px] text-[#767B84]">
                Open any parking facility&apos;s details drawer to rate and review it.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-[#F6F7F8] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[14.5px] text-[#141517]">
                        {rev.lotName}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309] text-[11.5px] font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {rev.rating}.0
                      </span>
                    </div>
                    <p className="text-[13px] text-[#525760]">{rev.comment}</p>
                    <p className="text-[11.5px] text-[#767B84]">
                      Fee: {rev.feeFeedback} · Security: {rev.securityRating}/5 · Cleanliness: {rev.cleanlinessRating}/5 · {rev.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenLotOnMap(rev.lotId)}
                    className="min-h-[38px] px-4 rounded-full bg-white hover:bg-[#EAECEF] text-[#141517] text-[12px] font-semibold border border-black/10 shrink-0"
                  >
                    View & Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: My Feedback Reports */}
      {sectionTab === 'reports' && (
        <div className="bg-white rounded-[24px] p-4 sm:p-6 shadow-[0_12px_36px_rgba(20,21,23,0.05)] border border-black/[0.04] space-y-4">
          <h2 className="text-[17px] font-bold text-[#141517]">
            Price Corrections & Issue Reports ({userReports.length})
          </h2>

          {userReports.length === 0 ? (
            <p className="text-[13px] text-[#767B84]">
              You haven&apos;t submitted any price reports, corrections, or closure alerts yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {userReports.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-[#F6F7F8] rounded-2xl p-3.5 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[14px] text-[#141517]">
                        {rep.lotName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white text-[11px] font-semibold text-[#525760]">
                        {rep.issueType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[#525760] mt-1">
                      {rep.reportedPriceKhr !== undefined
                        ? `Reported rate: ${formatKhr(rep.reportedPriceKhr)} (${rep.vehicleType ?? 'car'}). `
                        : ''}
                      {rep.suggestedDetails}
                    </p>
                    <p className="text-[11px] text-[#767B84] mt-1">
                      {rep.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 capitalize ${
                      rep.status === 'resolved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : rep.status === 'dismissed'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {rep.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Admin Moderation Dashboard */}
      {sectionTab === 'admin' && currentUser.role === 'admin' && (
        <div className="bg-white rounded-[24px] p-4 sm:p-6 shadow-[0_12px_36px_rgba(20,21,23,0.05)] border border-black/[0.04] space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-[18px] font-bold text-[#141517]">
                Admin Verification & Moderation Queue
              </h2>
              <p className="text-[12.5px] text-[#767B84]">
                Verify community submissions before publishing them to the Phnom Penh map.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: 'pending', label: `Pending (${pendingCount})` },
                  { id: 'flagged', label: `Flagged (${flaggedCount})` },
                  {
                    id: 'approved',
                    label: `Approved (${
                      submissions.filter((s) => s.status === 'approved').length
                    })`,
                  },
                  {
                    id: 'rejected',
                    label: `Rejected (${
                      submissions.filter((s) => s.status === 'rejected').length
                    })`,
                  },
                  { id: 'reports', label: `Issue Reports (${openReportsCount} open)` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAdminFilter(tab.id)}
                  className={`min-h-[36px] px-3 py-1 rounded-full text-[12px] font-semibold transition-colors ${
                    adminFilter === tab.id
                      ? 'bg-[#141517] text-white'
                      : 'bg-[#F4F5F6] text-[#525760] hover:text-[#141517]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {adminFilter === 'reports' ? (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <p className="text-[13px] text-[#767B84]">No reports in queue.</p>
              ) : (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-[#F6F7F8] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-bold text-[14.5px] text-[#141517]">
                          {rep.lotName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white text-[11px] font-semibold text-[#525760]">
                          {rep.issueType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-[#767B84]">
                          by {rep.userName} · {rep.createdAt.slice(0, 10)}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-[#525760]">
                        {rep.reportedPriceKhr !== undefined
                          ? `Observed rate: ${formatKhr(rep.reportedPriceKhr)} (${rep.vehicleType ?? 'car'}). `
                          : ''}
                        {rep.suggestedDetails}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {rep.status === 'open' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onResolveReport(rep.id, 'resolved')}
                            className="min-h-[36px] px-3.5 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[12px] font-bold"
                          >
                            Mark Resolved
                          </button>
                          <button
                            type="button"
                            onClick={() => onResolveReport(rep.id, 'dismissed')}
                            className="min-h-[36px] px-3.5 rounded-full bg-white text-[#525760] text-[12px] font-semibold border border-black/10"
                          >
                            Dismiss
                          </button>
                        </>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-white text-[11.5px] font-semibold text-[#525760] capitalize">
                          {rep.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : adminFilteredSubmissions.length === 0 ? (
            <div className="bg-[#F6F7F8] rounded-2xl p-6 text-center text-[13.5px] text-[#767B84]">
              No submissions in the <strong className="capitalize">{adminFilter}</strong> queue.
            </div>
          ) : (
            <div className="space-y-3.5">
              {adminFilteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  data-testid={`admin-sub-${sub.id}`}
                  className="bg-[#F6F7F8] rounded-[22px] p-4 sm:p-5 space-y-3 border border-black/[0.05]"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={sub.status} />
                        <span className="text-[11.5px] font-semibold text-[#525760]">
                          {FACILITY_TYPE_LABELS[sub.facilityType]} · {sub.district}
                        </span>
                        <span className="text-[11.5px] text-[#767B84]">
                          Submitted by {sub.submittedByName} ({sub.submittedAt.slice(0, 10)})
                        </span>
                      </div>
                      <h3 className="text-[16px] font-bold text-[#141517]">
                        {sub.name}
                      </h3>
                      <p className="text-[12.5px] text-[#525760]">{sub.address}</p>
                      <p className="text-[12px] font-semibold text-[#141517]">
                        {renderFeeSummary(sub)} · Hours: {sub.openHours} ·{' '}
                        <span className="font-mono text-[11px] text-[#6B7280]">
                          {sub.position.lat.toFixed(5)}, {sub.position.lng.toFixed(5)}
                        </span>
                      </p>
                      {sub.flagReason && (
                        <p className="text-[12px] text-orange-800 bg-orange-50 rounded-xl px-3 py-1.5">
                          Flag reason: {sub.flagReason}
                        </p>
                      )}
                    </div>

                    {sub.photos.length > 0 && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {sub.photos.slice(0, 3).map((p) => (
                          <img
                            key={p.id}
                            src={p.dataUrl}
                            alt={p.caption || sub.name}
                            className="w-14 h-14 rounded-xl object-cover border border-black/10"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-black/[0.06]">
                    <input
                      type="text"
                      value={moderationNotes[sub.id] ?? sub.moderationNote ?? ''}
                      onChange={(e) =>
                        setModerationNotes((prev) => ({
                          ...prev,
                          [sub.id]: e.target.value,
                        }))
                      }
                      placeholder="Optional verification / rejection note..."
                      className="flex-1 h-9 px-3 rounded-xl bg-white border border-black/10 text-[12px] text-[#141517]"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      {sub.status !== 'approved' && (
                        <button
                          type="button"
                          data-testid={`approve-btn-${sub.id}`}
                          onClick={() =>
                            onModerateSubmission(
                              sub.id,
                              'approved',
                              moderationNotes[sub.id]
                            )
                          }
                          className="min-h-[36px] px-3.5 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[12px] font-bold inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      )}
                      {sub.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() =>
                            onModerateSubmission(
                              sub.id,
                              'rejected',
                              moderationNotes[sub.id] || 'Rejected by moderator'
                            )
                          }
                          className="min-h-[36px] px-3.5 rounded-full bg-white hover:bg-red-50 text-red-700 text-[12px] font-semibold border border-red-200 inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditSubmission(sub)}
                        className="min-h-[36px] px-3 rounded-full bg-white hover:bg-[#EAECEF] text-[#141517] text-[12px] font-semibold border border-black/10 inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSubmission(sub.id)}
                        aria-label={`Remove ${sub.name}`}
                        className="min-h-[36px] px-3 rounded-full bg-white hover:bg-red-50 text-[#6B7280] hover:text-red-700 text-[12px] font-semibold border border-black/10 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
