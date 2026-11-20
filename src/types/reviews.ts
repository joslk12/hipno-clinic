export type ReviewStatus = 'approved' | 'pending'

export interface Review {
  id: string
  name: string
  rating: number
  message: string
  status: ReviewStatus
  createdAt: string
}

export type PublicReview = Pick<Review, 'id' | 'name' | 'rating' | 'message' | 'createdAt'>

export interface ReviewSummary {
  average: number
  count: number
}

export interface ReviewsResponse {
  reviews: PublicReview[]
  summary: ReviewSummary
}

export interface CreateReviewPayload {
  name: string
  rating: number
  message: string
  consent: boolean
  honeypot?: string
  invitationToken: string
}

export interface CreateReviewResult {
  review: PublicReview
  status: ReviewStatus
  message: string
}

export interface PendingReviewsResponse {
  reviews: Review[]
}

export interface ApiErrorBody {
  error: string
  fields?: Record<string, string>
}
