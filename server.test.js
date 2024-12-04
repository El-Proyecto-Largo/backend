// External dependencies
const express = require("express");
const jwt = require("jsonwebtoken");
const { MongoClient, ObjectId } = require("mongodb");
const db = require("./server.js")
const request = require("supertest");

// Get the express app
const app = require("./server.js");

// JWT key
const JWT_SECRET = process.env.JWT_SECRET || "jwt-secret-fallback-pls-make-sure-env-has-it";

// Mock User for JWT token
let mockUser = {
    _id: 12345,
    username: "JSmith",
    password: "password",
    firstName: "John",
    lastName: "Smith",
    email: "johnsmith123@gmail.com",
    image: "profile-pic.png"
};

// Mock JWT token
const mockToken = jwt.sign(
    {
        userId: mockUser._id,
        username: mockUser.username,
        email: mockUser.email,
    },
    JWT_SECRET,
    { expiresIn: "1m"}
);

// Endpoint headers
const testHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${mockToken}`,
}

// Mock database functions and database
let mockInsertOne;
let mockFind;
let mockFindOne;
let mockUpdateOne;
let mockDeleteOne;
let mockDeleteMany;

let mockCollection;
let mockDb;

// Mock post for all tests
let mockPost;

beforeEach(() => {
    // Mock JWT sign and verify
    jest.mock("jsonwebtoken", () => ({
        sign: jest.fn(() => mockToken), // Returns the mockToken
        verify: jest.fn((token, JWT_SECRET, callback) => {
            if(token == mockToken)
                callback(null, { // Simulates valid token 
                    userId: mockUser._id, 
                    username: mockUser.username, 
                    email: mockUser.email 
                });
            else
                callback(new Error("Invalid token"), null); // Simulates invalid token
        }),
    }));

    mockInsertOne = jest.fn();
    mockFind = jest.fn();
    mockFindOne = jest.fn();
    mockUpdateOne = jest.fn();
    mockDeleteOne = jest.fn();
    mockDeleteMany = jest.fn();

    mockCollcetion = {
        insertOne: mockInsertOne,
        find: mockFind,
        findOne: mockFindOne,
        updateOne: mockUpdateOne,
        deleteOne: mockDeleteOne,
        deleteMany: mockDeleteMany,
    };

    mockDb = {
        collection: jest.fn(db).mockReturnValue(mockCollection),
    };

    jest.spyOn(MongoClient.prototype, "db").mockReturnValue(mockDb);

    mockUser = {
        _id: 12345,
        username: "JSmith",
        password: "password",
        firstName: "John",
        lastName: "Smith",
        email: "johnsmith123@gmail.com",
        image: "profile-pic.png"
    };

    mockPost = {
        _id: 123456,
        title: "Test Post",
        body: "testing testing 123",
        image: "test-image.png",
        latitude: -70.00,
        authorId: mockUser._id,
        longitude: 70.00,
        tags: ["test"],
        createdAt: new Date(),
    };
});

afterEach(() => {
    jest.restoreAllMocks();
});

// post/reply endpoints unit testing
describe("post/reply API", () => {
    // create post test
    //  201 (postId)
    //  400 (Not all necessary fields are present)
    //  500 (Could not make this post)
    describe("POST /api/createpost", () => {
        test("returns 201 if post was created", async () => {
            mockInsertOne.mockReturnValueOnce({
                acknowledged: true,
                insertedId: new ObjectId(),
            });

            const response = await request(app)
                .post("/api/createpost")
                .set(testHeaders)
                .send({
                    title: "Test Post",
                    body: "testing testing 123",
                    image: "test-image.png",
                    latitude: -70.00,
                    longitude: 70.00,
                    tags: ["test"],
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty( "postId" );
        });

        test("returns 400 if necessary fields are not all filled in", async () => {
            const response = await request(app)
                .post("/api/createpost")
                .set(testHeaders)
                .send({
                    image: "test-image.png",
                    latitude: -70.00,
                    longitude: 70.00,
                    tags: ["test"],
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: "Not all necessary fields are present" });
        });

        test("returns 500 if post could not be made", async () => {
            // MongoClient.prototype.close = jest.fn();
            // MongoClient.prototype.close();

            mockInsertOne.mockRejectedValueOnce(new Error("Insert failed"));

            // await expect(db.collection.insertOne(mockPost)).rejects.toThrow("Insert failed");

            // jest.spyOn(MongoClient.prototype, "db").mockReturnValue({
            //     collection: jest.fn().mockReturnValue({
            //         insertOne: new Error("Insert failed"),
            //     }),
            // });
            
            const response = await request(app)
                .post("/api/createpost")
                .set(testHeaders)
                .send({
                    title: "Test Post",
                    body: "testing testing 123",
                    image: "test-image.png",
                    latitude: "ffeik",
                    longitude: "ncvji",
                    tags: ["test"],
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "Could not make post" });
        });
    });
});
//     // get post/reply test
//     //  200 (post/reply)
//     //  404 (Post or reply not found)
//     //  500 (Couldn't get post or reply)
//     describe("GET /api/posts/:_id", () => {
//         test("returns 200 if post or reply was found", async () => {
//             mockDb.collection.find = jest.fn().mockResolvedValue(mockPost);

//             const response = await request(app)
//                 .get(`/api/post/${mockPost._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual(mockPost);
//         });

//         test("returns 404 if post or reply wasn't found", async () => {
//             mockDb.collection.find = jest.fn().mockResolvedValue(null);

//             const response = await request(app)
//                 .get(`/api/post/${mockPost._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(404);
//             expect(response.body).toEqual({ error: "Post or reply not found" });
//         });

//         test("returns 500 if post or reply could not be searched for", async () => {
//             mockDb.collection.find = jest.fn().mockImplementationOnce(() => {
//                 throw new Error("Find failed");
//             });

//             const response = await request(app)
//                 .get(`/api/post/${mockPost._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(500);
//             expect(response.body).toEqual({ error: "Couldn't get post or reply" });
//         });
//     });

//     // update post test
//     //  200 (Post updated)
//     //  400 (No fields provided :()
//     //  403 (that aint yo post bruh u cant edit that)
//     //  404 (Post not found :()
//     //  500 (Failed to update post)
//     describe("PUT /api/updatepost/:_id", () => {
//         test("returns 200 if post was updated", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockPost)
//             mockDb.collection.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
            
//             const response = await request(app)
//                 .put(`/api/updatepost/${mockPost._id}`)
//                 .set(testHeaders)
//                 .send({
//                     title: "Updated Title",
//                     body: "updated body",
//                     image: "new-image.png", 
//                     longitude: 70.00,
//                     latitude: -70.00,
//                     tags: ["updated"],
//                 });

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual({ message: "Post updated" });
//         });

//         test("returns 400 if no fields were provided", async () => {
//             const response = await request(app)
//                 .put(`/api/updatepost/${mockPost._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(400);
//             expect(response.body).toEqual({ error: "No fields provided :(" });
//         });

//         test("returns 403 if user isn't author", async () => {
//             mockPost.authorId = 54321;

//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockPost);

//             const response = await request(app)
//                 .put(`/api/updatepost/${mockPost._id}`)
//                 .set(testHeaders)
//                 .send({
//                     title: "Updated Title",
//                     body: "updated body",
//                     image: "new-image.png", 
//                     longitude: 70.00,
//                     latitude: -70.00,
//                     tags: ["updated"],
//                 });

//             expect(response.status).toBe(403);
//             expect(response.body).toEqual({ error: "that aint yo post bruh u cant edit that" });
//         });

//         test("returns 404 if post wasn't found", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(null);

//             const response = await request(app)
//                 .put(`/api/updatepost/${mockPost._id}`)
//                 .set(testHeaders)
//                 .send({
//                     title: "Updated Title",
//                     body: "updated body",
//                     image: "new-image.png", 
//                     longitude: 70.00,
//                     latitude: -70.00,
//                     tags: ["updated"],
//                 });

//             expect(response.status).toBe(404);
//             expect(response.body).toEqual({ error: "Post not found :(" });
//         });

//         test("returns 500 post failed to update", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockPost);
//             mockDb.collection.updateOne = jest.fn().mockImplementationOnce(() => {
//                 throw new Error("Update failed");
//             });

//             const response = await request(app)
//                 .put(`/api/updatepost/${mockPost._id}`)
//                 .set(testHeaders)
//                 .send({
//                     title: "Updated Title",
//                     body: "updated body",
//                     image: "new-image.png", 
//                     longitude: 70.00,
//                     latitude: -70.00,
//                     tags: ["updated"],
//                 });

//             expect(response.status).toBe(500);
//             expect(response.body).toEqual({ error: "Failed to update post" });
//         });
//     });

//     // delete post/reply test
//     //  204 (Post or reply  successfully deleted)
//     //  403 (that aint yo post or reply bruh u cant delete that)
//     //  404 (cant delete a post or reply that doesnt exist) x2
//     //  500 (Failed to delete post )
//     describe("DELETE /api/deletepost/:_id", () => {
//         test("returns 204 if post was deleted", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockPost);
//             mockDb.collection.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

//             const response = await request(app)
//                 .delete(`/api/deletepost/${mockPost._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(204);
//             expect(response.body).toEqual({ message: "Post or reply deleted" });
//         });

//         test("returns 403 if user isn't author", async () => {
//             mockPost.authorId = 54321;
            
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockPost);

//             const response = await request(app)
//                 .delete(`/api/deletepost/${mockPost._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(403);
//             expect(response.body).toEqual({ error: "that aint yo post or reply bruh u cant delete that" });
//         });

//         test("returns 404 if post wasn't found initially", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(null);
            
//             const response = await request(app)
//                 .delete(`/api/deletepost/${mockPost._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(404);
//             expect(response.body).toEqual({ error: "cant delete a post or reply that doesnt exist" });
//         });

//         test("returns 404 if post could not be deleted but was found", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockPost);
//             mockDb.collection.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 0 });

//             const response = await request(app)
//                 .delete(`/api/deletepost/${mockPost._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(404);
//             expect(response.body).toEqual({ error: "Could not delete - post or reply does not exist" });
//         });

//         test("returns 500 if post could not be deleted", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockPost);
//             mockDb.collection.deleteOne = jest.fn().mockImplementationOnce(() => {
//                 throw new Error("Delete failed");
//             }); 

//             const response = await request(app)
//                 .delete(`/api/deletepost/${mockPost._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(500);
//             expect(response.body).toEqual({ error: "Failed to delete post or reply" });
//         });
//     });

//     //create reply test
//     //  201 (Reply successfully created)
//     //  400 (Not all necessary fields are present)
//     //  500 (Reply could not be made)
//     describe("POST /api/createreply", () => {
//         test("returns 201 if reply was created", async () => {
//             mockDb.collection.insertOne = jest.fn().mockResolvedValue({ 
//                 acknowledged: true,
//                 insertedId: 1234567,
//             });

//             const response = await request(app)
//                 .post("/api/createreply")
//                 .set(testHeaders)
//                 .send({
//                     body: "test reply",
//                     image: "reply-image.png",
//                     replyTo: mockPost._id,
//                 });

//             expect(response.status).toBe(201);
//             expect(response.body).toEqual({ error: "Not all necessary fields are present" });
//         });

//         test("returns 400 if not all fields are filled in", async () => {
//             const response = await request(app)
//                 .post("/api/createreply")
//                 .set(testHeaders)
//                 .send({ body: "test reply" });

//             expect(response.status).toBe(400);
//             expect(response.body).toEqual({ message: "Reply successfully created" });
//         });

//         test("returns 500 if reply could not be created", async () => {
//             mockDb.collection.insertOne = jest.fn().mockImplementationOnce(() => {
//                 throw new Error("Insert failed");
//            }); 

//             const response = await request(app)
//                 .post("/api/createreply")
//                 .set(testHeaders)
//                 .send({
//                     body: "test reply",
//                     image: "reply-image.png",
//                     replyTo: mockPost._id,
//                 });

//             expect(response.status).toBe(500);
//             expect(response.body).toEqual({ error: "Reply could not be made" });
//         });
//     });

//     // update reply test
//     //  200 (Reply updated)
//     //  400 (No fields provided :()
//     //  403 (you cant update a reply that isnt yours silly)
//     //  404 (Reply not found :()
//     //  500 (Failed to update reply )
//     describe("PUT /api/updatereply/:_id", () => {
//         let mockReply = {
//             _id: 1234567,
//             authorId: mockUser._id,
//             body: "Test Reply",
//             image: "reply-image.png",
//             replyTo: mockPost._id,
//         };

//         test("returns 200 if the reply was updated", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockReply)
//             mockDb.collection.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });

//             const response = await request(app)
//                 .put(`/api/updatereply/${mockReply._id}`)
//                 .set(testHeaders)
//                 .send({
//                     title: "Updated Reply",
//                     body: "updated body",
//                     image: "new-image.png",
//                 });

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual({ message: "Reply updated" });
//         });

//         test("returns 400 if no fields were filled in", async () => {
//             const response = await request(app)
//                 .put(`/api/updatereply/${mockReply._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(400);
//             expect(response.body).toEqual({ error: "No fields provided :(" });
//         });

//         test("returns 403 if user isn't author", async () => {
//             mockReply.authorId = 54321;

//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockReply)

//             const response = await request(app)
//                 .put(`/api/updatereply/${mockReply._id}`)
//                 .set(testHeaders)
//                 .send({
//                     title: "Updated Reply",
//                     body: "updated body",
//                     image: "new-image.png",
//                 });

//             expect(response.status).toBe(403);
//             expect(response.body).toEqual({ error: "you cant update a reply that isnt yours silly" });
//         });

//         test("returns 404 if reply doesn't exist", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(null)

//             const response = await request(app)
//                 .put(`/api/updatereply/${mockReply._id}`)
//                 .set(testHeaders)
//                 .send({
//                     title: "Updated Reply",
//                     body: "updated body",
//                     image: "new-image.png",
//                 });

//             expect(response.status).toBe(404);
//             expect(response.body).toEqual({ error: "Reply not found :(" });
//         });

//         test("returns 500 if reply could not be updated", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockPost);
//             mockDb.collection.updateOne = jest.fn().mockImplementationOnce(() => {
//                 throw new Error("Update failed");
//             });

//             const response = await request(app)
//                 .put(`/api/updatereply/${mockReply._id}`)
//                 .set(testHeaders)
//                 .send({
//                     title: "Updated Reply",
//                     body: "updated body",
//                     image: "new-image.png",
//                 });

//             expect(response.status).toBe(500);
//             expect(response.body).toEqual({ error: "Failed to update reply" });
//         });
//     });

//     // search posts/replies test
//     //  200 (Posts and or replies were found OR No posts or replies were found)
//     //  500 (Failed to search for posts and or replies)
//     describe("POST /api/searchposts", () => {
//         test("returns 200 if posts or replies were found", async () => {
//             const mockPost2 = {
//                 _id: 1234567,
//                 title: "Test Post 2",
//                 body: "testing testing 321",
//                 image: "test-image2.png",
//                 latitude: -77.00,
//                 authorId: mockUser._id,
//                 longitude: 77.00,
//                 tags: ["test2"],
//                 createdAt: new Date(),
//             };

//             const postArr = [mockPost, mockPost2];
//             const tagsArr = ["test", "test2"];
//             const returnArr = postArr.concat(tagsArr);

//             mockDb.collection.find = jest.fn().mockImplementationOnce(postArr).mockResolvedValue(tagsArr);

//             const response = await request(app)
//                 .post("/api/searchposts")
//                 .set(testHeaders)
//                 .send({
//                     title: "Test Post",
//                     body: "testing",
//                     authorId: mockUser._id,
//                     tags: ["test", "test2"],
//                 });

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual(returnArr);
//         });

//         test("returns 200 if no posts or replies were found", async () => {
//             mockDb.collection.find = jest.fn().mockImplementationOnce(null).mockResolvedValue(null);

//             const response = await request(app)
//                 .post("/api/searchposts")
//                 .set(testHeaders)
//                 .send({
//                     title: "Test Post",
//                     body: "testing",
//                     authorId: mockUser._id,
//                     tags: ["test", "test2"],
//                 });

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual([]);
//         });

//         test("returns 500 if search fails", async () => {
//             mockDb.collection.find = jest.fn().mockImplementationOnce(() => {
//                 throw new Error("Search failed");
//             }); 

//             const response = await request(app)
//                 .post("/api/")
//                 .set(testHeaders)
//                 .send({
//                     title: "Test Post",
//                     body: "testing",
//                     authorId: mockUser._id,
//                     tags: ["test", "test2"],
//                 });

//             expect(response.status).toBe(500);
//             expect(response.body).toEqual({ error: "Failed to search for posts and or replies" });
//         });
//     });

//     // get local posts test
//     //  200 (Local posts found OR No local posts found)
//     //  400 (Not all necessary fields are present)
//     //  500 (Could not get local posts)
//     describe("POST /api/getlocalposts", () => {
//         const mockPost2 = {
//             _id: 1234567,
//             title: "Test Post 2",
//             body: "testing testing 321",
//             image: "test-image2.png",
//             latitude: -77.00,
//             authorId: 12345,
//             longitude: 77.00,
//             tags: ["test"],
//             createdAt: new Date(),
//         };

//         const postArr = [mockPost, mockPost2];

//         test("returns 200 if local posts were found", async () => {
//             mockDb.collection.find = jest.fn().mockResolvedValue(postArr);

//             const response = await request(app)
//                 .post("/api/getlocalposts")
//                 .set(testHeaders)
//                 .send({
//                     latitude: -73.50,
//                     longitude: 73.50,
//                     distance: 5.00,
//                 });

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual(postArr);
//         });

//         test("returns 200 if no local posts were found", async () => {
//             mockDb.collection.find = jest.fn().mockResolvedValue(null);

//             const response = await request(app)
//                 .post("/api/getlocalposts")
//                 .set(testHeaders)
//                 .send({
//                     latitude: -73.50,
//                     longitude: 73.50,
//                     distance: 5.00,
//                 });

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual([]);
//         });

//         test("returns 400 if not all fields were filled in", async () => {
//             const response = await request(app)
//                 .post("/api/getlocalposts")
//                 .set(testHeaders)
//                 .send({ distance: 5.00 });

//             expect(response.status).toBe(400);
//             expect(response.body).toEqual({ error: "Not all necessary fields are present" });
//         });

//         test("returns 500 if local search fails", async () => {
//             mockDb.collection.find = jest.fn().mockImplementationOnce(() => {
//                 throw new Error("Search failed");
//            }); 

//             const response = await request(app)
//                 .post("/api/getlocalposts")
//                 .set(testHeaders)
//                 .send({
//                     latitude: -73.50,
//                     longitude: 73.50,
//                     distance: 5.00,
//                 });

//             expect(response.status).toBe(500);
//             expect(response.body).toEqual({ error: "Could not get local posts" });
//         });
//     });

//     // get replies test
//     //  200 (Replies found OR No replies found)
//     //  404 (No original post found: cannot get replies)
//     //  500 (Failed to get replies for post )
//     describe("POST /api/posts/:_id/getreplies", () => {
//         test("returns 200 if replies were found", async () => {
//             const mockReply1 = {
//                 _id: 1234567,
//                 authorId: mockUser._id,
//                 body: "Test Reply",
//                 image: "reply-image.png",
//                 replyTo: mockPost._id,
//             };

//             const mockReply2 = {
//                 _id: 12345678,
//                 authorId: 12345,
//                 body: "test reply",
//                 image: "reply-image.png",
//                 replyTo: mockPost._id,
//             };

//             const replyArr = [mockReply1, mockReply2];

//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockPost);
//             mockDb.collection.find = jest.fn().mockResolvedValue(replyArr);

//             const response = await request(app)
//                 .post(`/api/posts/${mockPost._id}/getreplies`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual(replyArr);
//         });

//         test("returns 200 if no replies were found", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockPost);
//             mockDb.collection.find = jest.fn().mockResolvedValue(null);

//             const response = await request(app)
//                 .post(`/api/posts/${mockPost._id}/getreplies`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual([]);
//         });

//         test("returns 404 if original post wasn't found", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(null);

//             const response = await request(app)
//                 .post(`/api/posts/${mockPost._id}/getreplies`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(404);
//             expect(response.body).toEqual({ error: "No original post found: cannot get replies" });
//         });

//         test("returns 500 if replies could not be found", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockPost);
//             mockDb.collection.find = jest.fn().mockImplementationOnce(() => {
//                 throw new Error("Find failed");
//            }); 

//             const response = await request(app)
//                 .post(`/api/posts/${mockPost._id}/getreplies`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(500);
//             expect(response.body).toEqual({ error: "Failed to get replies for post" });
//         });
//     });

//     // get pins test
//     //  200 (Pins found OR No pins found)
//     //  400 (Not all necessary fields are present)
//     //  500 (Could not get pins)
//     describe("GET /api/getpins", () => {
//         const mockPost2 = {
//             _id: 1234567,
//             title: "Test Post 2",
//             body: "testing testing 321",
//             image: "test-image2.png",
//             latitude: -77.00,
//             authorId: 12345,
//             longitude: 77.00,
//             tags: ["test"],
//             createdAt: new Date(),
//         };

//         const postArr = [mockPost, mockPost2];

//         test("returns 200 if pins were found", async () => {
//             mockDb.collection.find = jest.fn().mockResolvedValue(postArr);

//             const mockGeometry = {
//                 type: "Point",
//                 coordinates: [],
//             };

//             const mockProperties = {
//                 id: mockPost._id,
//                 title: mockPost.title,
//                 body: mockPost.body,
//                 author: mockPost.authorId,
//             };

//             const mockProperties2 = {
//                 id: mockPost2._id,
//                 title: mockPost2.title,
//                 body: mockPost2.body,
//                 author: mockPost2.authorId,
//             };

//             const mockPin = {
//                 type: "Feature",
//                 geometry: mockGeometry,
//                 properties: mockProperties,
//             };

//             const mockPin2 = {
//                 type: "Feature",
//                 geometry: mockGeometry,
//                 properties: mockProperties2,
//             };

//             const pinArr = [mockPin, mockPin2];

//             const response = await request(app)
//                 .post("/api/getpins")
//                 .set(testHeaders)
//                 .send({
//                     latitude: -73.50,
//                     longitude: 73.50,
//                     distance: 5.00,
//                 });

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual(pinArr);
//         });

//         test("returns 200 if no pins were found", async () => {
//             mockDb.collection.find = jest.fn().mockResolvedValue(null);

//             const response = await request(app)
//                 .get("/api/getpins")
//                 .set(testHeaders)
//                 .send({
//                     latitude: -73.50,
//                     longitude: 73.50,
//                     distance: 5.00,
//                 });

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual([]);
//         });

//         test("returns 400 if not all fields were filled in", async () => {
//             const response = await request(app)
//                 .get("/api/getlocalposts")
//                 .set(testHeaders)
//                 .send({ distance: 5.00 });

//             expect(response.status).toBe(400);
//             expect(response.body).toEqual({ error: "Not all necessary fields are present" });
//         });

//         test("returns 500 if pins could not be found", async () => {
//             mockDb.collection.find = jest.fn().mockImplementationOnce(() => {
//                 throw new Error("Find failed");
//            }); 

//             const response = await request(app)
//                 .get("/api/getpins")
//                 .set(testHeaders)
//                 .send({
//                     latitude: -73.50,
//                     longitude: 73.50,
//                     distance: 5.00,
//                 });

//             expect(response.status).toBe(500);
//             expect(response.body).toEqual({ error: "Could not get pins" });
//         });
//     });
// });

describe("user API", () => {
    // authenticate user test
    //  200 (Authenticated)
    //  401 (Authentication failed - No token)
    //  403 (Authentication failed - Invalid token)
    describe("GET /api/authenticate", () => {
        test("returns 200 if authentication succeeds", async () => {
            const response = await request(app)
                .get("/api/authenticate")
                .set(testHeaders)
                .send({});

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: "Successfully authenticated" });
        });

        test("returns 401 if there is no token to be authenticated", async () => {
            const response = await request(app)
                .get("/api/authenticate")
                .send({});

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: "Authentication failed" });
        });

        test("returns 403 if token is invalid", async () => {
            jwt.verify = jest.fn((token, JWT_SECRET, callback) => {
                callback(new Error("Invalid token"), null);
            });

            const response = await request(app)
                .get("/api/authenticate")
                .set(testHeaders)
                .send({});

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ error: "Invalid token" });
        });
    });
});
//     // login test
//     //  200 (User logged in)
//     //  400 (not all login fields were filled in vro)
//     //  401 (invalid credz)
//     //  500 (server error while tryna login)
//     describe("POST /api/login", () => {
//         test("returns 200 if user was logged in", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockUser);

//             const response = await request(app)
//                 .post("/api/login")
//                 .set(testHeaders)
//                 .send({
//                     login: "Jsmith",
//                     password: "password",
//                 });

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual({
//                 token,
//                 userId: mockUser._id,
//                 message: "User logged in",
//             });
//         });

//         test("returns 400 if not all login info was filled in", async () => {
//             const response = await request(app)
//                 .post("/api/login")
//                 .set(testHeaders)
//                 .send({ login: "JSmith" });

//             expect(response.status).toBe(400);
//             expect(response.body).toEqual({ error: "not all login fields were filled in vro" });
//         });

//         test("returns 401 if the username was incorrect", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockUser);

//             const response = await request(app)
//                 .post("/api/login")
//                 .set(testHeaders)
//                 .send({
//                     login: "NotJSmith",
//                     password: "password",
//                 });

//             expect(response.status).toBe(401);
//             expect(response.body).toEqual({ error: "invalid credz" });
//         });

//         test("returns 401 if the password was incorrect", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockUser);

//             const response = await request(app)
//                 .post("/api/login")
//                 .set(testHeaders)
//                 .send({
//                     login: "JSmith",
//                     password: "wrongpassword",
//                 });

//             expect(response.status).toBe(401);
//             expect(response.body).toEqual({ error: "invalid credz" });
//         });

//         test("returns 500 if login fails", async () => {
//             mockDb.collection.findOne = jest.fn().mockImplementationOnce(() => {
//                 throw new Error("Find failed");
//             }); 

//             const response = await request(app)
//                 .post("/api/login")
//                 .set(testHeaders)
//                 .send({
//                     login: "Jsmith",
//                     password: "password",
//                 });

//             expect(response.status).toBe(500);
//             expect(response.body).toEqual({ error: "server error while tryna login" });
//         });
//     });

//     // user endpoints unit testing
//     // register user test
//     //  201 (User registered successfully >W<)
//     //  400 (Missing some register fields :(()
//     //  409 (username already exists! OR email has already been registered to an account)
//     //  500 (A servar ewwow happend ;()
//     describe("POST /api/registeruser", () => {
//         test("returns 201 if user was created", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(null);
//             mockDb.collection.insertOne = jest.fn().mockResolvedValue({ 
//                 acknowledged: true,
//                 insertedId: 12345,
//             });

//             const response = await request(app)
//                 .post("/api/registeruser")
//                 .set(testHeaders)
//                 .send({
//                     username: "JSmith",
//                     password: "password",
//                     firstName: "John",
//                     lastName: "Smith",
//                     email: "johnsmith123@gmail.com",
//                 });

//             expect(response.status).toBe(201);
//             expect(response.body).toEqual({ message: "User registered successfully >W<" });
//         });

//         test("returns 400 if all register fields aren't filled in", async () => {
//             const response = await request(app)
//                 .post("/api/registeruser")
//                 .set(testHeaders)
//                 .send({ username: "JSmith" });

//             expect(response.status).toBe(400);
//             expect(response.body).toEqual({ error: "Missing some register fields :((" });
//         });

//         test("returns 409 if username already exists", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockUser);

//             const response = await request(app)
//                 .post("/api/registeruser")
//                 .set(testHeaders)
//                 .send({
//                     username: "JSmith",
//                     password: "password",
//                     firstName: "John",
//                     lastName: "Smith",
//                     email: "smithjohn321@gmail.com",
//                 });

//             expect(response.status).toBe(409);
//             expect(response.body).toEqual({ error: "username already exists!" });
//         });

//         test("returns 409 if email is in use", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockUser);

//             const response = await request(app)
//                 .post("/api/registeruser")
//                 .set(testHeaders)
//                 .send({
//                     username: "SmithJ",
//                     password: "password",
//                     firstName: "John",
//                     lastName: "Smith",
//                     email: "johnsmith123@gmail.com",
//                 });

//             expect(response.status).toBe(409);
//             expect(response.body).toEqual({ error: "email has already been registered to an account" });
//         });

//         test("returns 500 if register fails", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(null);
//             mockDb.collection.insertOne = jest.fn().mockImplementationOnce(() => {
//                 throw new Error("Insert failed");
//             }); 

//             const response = await request(app)
//                 .post("/api/")
//                 .set(testHeaders)
//                 .send({
//                     username: "JSmith",
//                     password: "password",
//                     firstName: "John",
//                     lastName: "Smith",
//                     email: "johnsmith123@gmail.com",
//                 });

//             expect(response.status).toBe(500);
//             expect(response.body).toEqual({ error: "A servar ewwow happend ;(" });
//         });
//     });

//     // get user test
//     //  200 (User  found)
//     //  404 (User not found :()
//     //  500 (couldnt fetch user details of user  wtf!!)
//     describe("GET /api/users/:_id", () => {
//         test("returns 200 if user was found", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockUser);

//             const response = await request(app)
//                 .get(`/api/user/${mockUser._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual(mockUser);
//         });

//         test("returns 404 if user was not found", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(null);

//             const response = await request(app)
//                 .get(`/api/user/${mockUser._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(404);
//             expect(response.body).toEqual({ error: "User not found :(" });
//         });

//         test("returns 500 if fails", async () => {
//             mockDb.collection.findOne = jest.fn().mockImplementationOnce(() => {
//                 throw new Error("Find failed");
//             }); 

//             const response = await request(app)
//                 .get(`/api/user/${mockUser._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(500);
//             expect(response.body).toEqual({ error: "couldnt fetch user details wtf!!" });
//         });
//     });

//     // update user test
//     //  200 (updated dat user  x3)
//     //  400 (you need to provide a field to update bruh OR bro yo email format fricked up)
//     //  403 (you cant update a profile that isnt yours >:()
//     //  404 (User not found :()
//     //  500 (couldnt update user  wtf hapepnd)
//     describe("PUT /api/updateuser/:_id", () => {
//         test("returns 200 if user info was updated", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockUser);
//             mockDb.collection.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });

//             const response = await request(app)
//                 .put(`/api/updateuser/${mockUser._id}`)
//                 .set(testHeaders)
//                 .send({
//                     firstName: "Smith",
//                     lastName: "John",
//                     email: "smithjohn321@gmail.com",
//                 });

//             expect(response.status).toBe(200);
//             expect(response.body).toEqual({ message: "updated dat user x3" });
//         });

//         test("returns 400 if no info to update was provided", async () => {
//             const response = await request(app)
//                 .put(`/api/updateuser/${mockUser._id}`)
//                 .set(testHeaders)
//                 .send({});

//             expect(response.status).toBe(400);
//             expect(response.body).toEqual({ error: "you need to provide a field to update bruh" });
//         });

//         test("returns 400 if email is not formatted right", async () => {
//             const response = await request(app)
//                 .put(`/api/updateuser/${mockUser._id}`)
//                 .set(testHeaders)
//                 .send({ email: "" });

//             expect(response.status).toBe(400);
//             expect(response.body).toEqual({ error: "bro yo email format fricked up" });
//         });

//         test("returns 403 if current user is not the user being updated", async () => {
//             const response = await request(app)
//                 .put(`/api/updateuser/${54321}`)
//                 .set(testHeaders)
//                 .send({
//                     firstName: "Smith",
//                     lastName: "John",
//                     email: "smithjohn321@gmail.com",
//                 });

//             expect(response.status).toBe(403);
//             expect(response.body).toEqual({ error: "you cant update a profile that isnt yours >:(" });
//         });

//         test("returns 404 if user wasn't found", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(null);

//             const response = await request(app)
//                 .put(`/api/updateuser/${mockUser._id}`)
//                 .set(testHeaders)
//                 .send({
//                     firstName: "Smith",
//                     lastName: "John",
//                     email: "smithjohn321@gmail.com",
//                 });

//             expect(response.status).toBe(404);
//             expect(response.body).toEqual({ error: "User not found :(" });
//         });

//         test("returns 500 if user could not be updated", async () => {
//             mockDb.collection.findOne = jest.fn().mockResolvedValue(mockUser);
//             mockDb.collection.updateOne = jest.fn().mockImplementationOnce(() => {
//                 throw new Error("Update user failed");
//             }); 

//             const response = await request(app)
//                 .put(`/api/updateuser/${mockUser._id}`)
//                 .set(testHeaders)
//                 .send({
//                     firstName: "Smith",
//                     lastName: "John",
//                     email: "smithjohn321@gmail.com",
//                 });

//             expect(response.status).toBe(500);
//             expect(response.body).toEqual({ error: "couldnt update user wtf hapepnd" });
//         });
//     });

//     // delete user test
//     //  204 (BOOM! Account and all related content deleted! for id: _id)
//     //  400 (confirm password for account deletion)
//     //  401 (password is wrong)
//     //  403 (can only delete your own account)
//     //  404 (user not found :()
//     //  500 (Couldnt delete user idk why...)
//     // describe("DELETE /api/deleteuser/:_id", () => {
//     //     const mockReply = {
//     //         _id: 1234567,
//     //         authorId: mockUser._id,
//     //         body: "Test Reply",
//     //         image: "reply-image.png",
//     //         replyTo: mockPost._id,
//     //     };

//     //     test("returns 204 if account and related content was deleted", async () => {
//     //         mockDb.collection.findOne = jest.fn().mockResolvedValue(mockUser);
//     //         mockDb.collection.find = jest.fn().mockResolvedValue([mockPost]);
//     //         mockDb.collection.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
//     //         mockDb.collection.find = jest.fn().mockResolvedValue([mockReply]);
//     //         mockDb.collection.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

//     //         const response = await request(app)
//     //             .delete(`/api/deleteuser/${mockUser._id}`)
//     //             .send({ password: "password" });
    
//     //         expect(response.status).toBe(204);
//     //         expect(response.body).toEqual({ message: "BOOM! Account and all related content deleted!" });
//     //     });
    
//     //     test("returns 400 if password is not provided", async () => {
//     //         const response = await request(app)
//     //             .delete(`/api/deleteuser/${mockUser._id}`)
//     //             .send({ password: "password" });
    
//     //         expect(response.status).toBe(400);
//     //         expect(response.body).toEqual({ error: "confirm password for account deletion" });
//     //     });
    
//     //     test("returns 401 if password is incorrect", async () => {
//     //         mockDb.collection.findOne = jest.fn().mockResolvedValue(mockUser);
    
//     //         const response = await request(app)
//     //             .delete(`/api/deleteuser/${mockUser._id}`)
//     //             .send({ password: "wrongpassword" });
    
//     //         expect(response.status).toBe(401);
//     //         expect(response.body).toEqual({ error: "password is wrong" });
//     //     });
    
//     //     test("returns 403 if current user is not the user being deleted", async () => {
//     //         const response = await request(app)
//     //             .delete(`/api/deleteuser/${54321}`)
//     //             .send({ password: "password" });
    
//     //         expect(response.status).toBe(403);
//     //         expect(response.body).toEqual({ error: "can only delete your own account" });
//     //     });
    
//     //     test("returns 404 if user wasn't found", async () => {
//     //         mockDb.collection.findOne = jest.fn().mockResolvedValue(null);
    
//     //         const response = await request(app)
//     //             .delete(`/api/deleteuser/${mockUser._id}`)
//     //             .send({ password: "password" });
    
//     //         expect(response.status).toBe(404);
//     //         expect(response.body).toEqual({ error: "user not found :(" });
//     //     });
    
//     //     test("returns 500 if user could not be deleted", async () => {
//     //         mockDb.collection.findOne = jest.fn().mockResolvedValue(mockUser);
//     //         mockDb.collection.find = jest.fn().mockResolvedValue([mockPost]);
//     //         mockDb.collection.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
//     //         mockDb.collection.find = jest.fn().mockResolvedValue([mockReply]);
//     //         mockDb.collection.deleteOne = jest.fn().mockImplementationOnce(() => {
//     //             throw new Error("Delete user failed");
//     //         }); 

//     //         const response = await request(app)
//     //             .delete(`/api/deleteuser/${mockUser._id}`)
//     //             .send({ password: "password" });
    
//     //         expect(response.status).toBe(500);
//     //         expect(response.body).toEqual({ error: "Couldnt delete user idk why..." });
//     //     });
//     // });
// });