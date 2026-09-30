import type { Coordinates } from '../../services/types'
import type { Place } from '../../services/places.types'
import type { QuestWithDistance } from '../../rules/quests'

/** An approved place pin, with the submitter's display name for the popup. */
export interface MapPlace extends Place {
  authorName?: string
}

export interface QuestMapProps {
  quests: QuestWithDistance[]
  /** FR05/BR04: approved user places, drawn as amber diamond pins. */
  places?: MapPlace[]
  userLocation?: Coordinates | null
  center?: Coordinates | null
  zoom?: number
  selectedQuestId?: string | null
  onSelectQuest?: (questId: string) => void
  interactive?: boolean
  className?: string
}
