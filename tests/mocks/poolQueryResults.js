// Mock Pool Query Results
const mockPoolQueryResults = {
    dashboard_stats: {
        postStats: {
            rows: [{
                total_posts: 10,
                published_posts: 5,
                draft_posts: 3,
                private_posts: 2
            }]
        },
        commentStats: {
            rows: [{
                total_comments: 20,
                approved_comments: 15,
                pending_comments: 5
            }]
        },
        recentPosts: {
            rows: [{
                id: 1,
                title: 'Test Post',
                content: 'Test content',
                created_at: new Date()
            }]
        },
        recentComments: {
            rows: [{
                id: 1,
                content: 'Test comment',
                created_at: new Date(),
                post_title: 'Test Post'
            }]
        }
    },
    posts_list: {
        rows: [{
            id: 1,
            title: 'Test Post',
            status: 'published',
            created_at: new Date(),
            author_name: 'testadmin',
            categories: 'Test Category'
        }]
    },
    categories: {
        rows: [{
            id: 1,
            name: 'Test Category',
            description: 'Test Description'
        }]
    }
};

export default mockPoolQueryResults;