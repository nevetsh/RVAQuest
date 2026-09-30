import { QUEST_CATEGORIES } from '../../services/types'
import { Chip } from '../ui/Chip'
import { SearchInput } from '../ui/SearchInput'
import type { CategoryFilter } from '../../rules/quests'

interface QuestFiltersProps {
  query: string
  onQueryChange: (value: string) => void
  category: CategoryFilter
  onCategoryChange: (category: CategoryFilter) => void
}

export function QuestFilters({
  query,
  onQueryChange,
  category,
  onCategoryChange,
}: QuestFiltersProps) {
  return (
    <div className="space-y-3">
      <SearchInput
        id="quest-search"
        value={query}
        onChange={onQueryChange}
        placeholder="Search quests by name or location"
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip label="All" active={category === 'all'} onClick={() => onCategoryChange('all')} />
        {QUEST_CATEGORIES.map((option) => (
          <Chip
            key={option}
            label={option}
            active={category === option}
            onClick={() => onCategoryChange(option)}
          />
        ))}
      </div>
    </div>
  )
}
