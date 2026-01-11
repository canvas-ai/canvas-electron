import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type TopBarTab = 'tree' | 'home' | 'dotfiles'

export function ContextTopbar({
  tab = 'home',
  onTabChange = () => {},
  url,
  urlNode,
  urlPrefix,
  rightActions,
  rightActionsPlacement = 'inline',
  showTabs = true,
  className,
}: {
  tab?: TopBarTab
  onTabChange?: (tab: TopBarTab) => void
  url: string
  urlNode?: React.ReactNode
  urlPrefix?: React.ReactNode
  rightActions?: React.ReactNode
  rightActionsPlacement?: 'inline' | 'edge'
  showTabs?: boolean
  className?: string
}) {
  return (
    <div className={cn('no-drag w-full', className)}>
      <div className="flex items-stretch gap-2">
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {showTabs ? (
            <div className="flex items-end gap-6 px-1">
              <TabButton active={tab === 'tree'} onClick={() => onTabChange('tree')}>
                Tree
              </TabButton>
              <TabButton active={tab === 'home'} onClick={() => onTabChange('home')}>
                Home
              </TabButton>
              <TabButton active={tab === 'dotfiles'} onClick={() => onTabChange('dotfiles')}>
                Dotfiles
              </TabButton>
              <div className="flex-1" />
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-md border bg-background shadow-sm px-3 py-2">
            {urlPrefix ? <div className="text-sm font-medium text-muted-foreground">{urlPrefix}</div> : null}
            <div className="flex-1 min-w-0">
              {urlNode ? urlNode : <div className="font-mono text-base truncate">{url}</div>}
            </div>
            {rightActionsPlacement === 'inline' && rightActions ? (
              <div className="flex items-center gap-2">{rightActions}</div>
            ) : null}
          </div>
        </div>

        {rightActionsPlacement === 'edge' && rightActions ? (
          <div className="flex flex-col items-center justify-start gap-2 px-1">
            <div
              className="text-xs font-semibold tracking-wide text-muted-foreground select-none"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Actions
            </div>
            {rightActions}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('relative pb-2 text-sm font-medium text-muted-foreground hover:text-foreground')}
    >
      <span className="block">{children}</span>
      <span
        className={cn(
          'absolute left-0 right-0 -top-1 h-2 rounded-sm bg-transparent',
          active && 'bg-success'
        )}
      />
    </button>
  )
}

