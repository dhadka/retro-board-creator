export const defaultTitleTemplate = '{{{ team }}} Retro on {{{ date }}}'

export const defaultIssueTemplate = `Hey {{ driver }},
      
You are scheduled to drive the next retro on {{ date }}. The retro board has been created at {{{ url }}}. Please remind the team beforehand to fill out their cards.

Need help? Found a bug? Visit https://github.com/dhadka/retrobot.

Best Regards,

Retrobot`

export const defaultNotificationTemplate =
  '<!here|here> A retro is scheduled for today! Visit <{{{ url }}}|the retro board> to add your cards. CC retro driver @{{ driver }}.'

export const defaultNotificationEmoji = ':rocket:'

export const defaultColumnNames = ['Went well', 'Went meh', 'Could have gone better', 'Action items!']
