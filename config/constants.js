module.exports = {
  USER_TYPE: {
    ADMIN: 'admin',
    USER: 'user',
  },
  DURATION_TYPE: {
    DAY: 'Day',
    WEEK: 'Week',
    MONTH: 'Month',
    YEAR: 'Year',
  },
  ACTIVITY_TYPE: {
    SIGNUP: 'signup',
    LOGIN: 'login',
  },
  NOTIFICATION_TYPE: {
    SUBSCRIBE_USER: 'subscribe_user',
    COMMNET_STORY: 'comment_story',
    REPLIED_COMMENT_STORY: 'replied_comment_story',
    // REVIEWD_STORY: 'reviewed_story',
  },
  STORY_CATEGORY: {
    FEATURED: 'featured',
    ARENA: 'arena',
    SUBS: 'subs',
    SEARCH: 'search',
  },
  SOCKET_TYPE: {
    USER: 'user',
    CHANNEL: 'channel',
  },
  SOCKET_EVENT: {
    CONNECTED: 'connected',
    JOIN: 'join',
    ADD_CHANNEL: 'add_channel',
    UPDATE_CHANNEL: 'update_channel',
    REMOVE_CHANNEL: 'remove_channel',
    ADD_MESSAGE: 'add_message',
    REMOVE_MESSAGE: 'remove_message',
    NEW_NOTIFICATION: 'new_notification',
  },
  MESSAGE_TYPE: {
    TEXT: 'text',
    PHOTO: 'photo',
  },
  POST_SORT_TYPE: {
    NEW: 'New', 
    TOP_RATED: 'Top Rated', 
    MOST_VIEWED: 'Most Viewed',
  },
};
