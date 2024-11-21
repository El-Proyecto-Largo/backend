// Import app for consistency
// Import authToken middleware
import { app, authToken } from "./server.js";

// 
const jwt = require("jsonwebtoken");
const { request } = require("supertest");
const { MongoClient, ObjectId } = require("mongodb");

// Mock JWT key
const JWT_SECRET = "test-secret-key";

// Mock the database
const mockCollection = {
    insertOne: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
};

const mockDb = {
    collection: jest.fn(() => mockCollection),
};

const mockClient = {
    db: jest.fn(() => mockDb),
};

jest.mock("mongodb", () => ({
    MongoClient: {
        connect: jest.fn(() => Promise.resolve(mockClient)),
    },
    ObjectId: jest.fn((id) => ({ toString: () => id })),
}));

// post/reply endpoints unit testing
describe("post/reply API", () => {
    // Mock user
    const mockUser = {
        _id: new ObjectId(12345),
        username: "JSmith",
        password: "password",
        firstName: "John",
        lastName: "Smith",
        email: "johnsmith123@gmail.com",
        image: "profile-pic.png"
    };

    // create post test
    //  201 (Successfully made post)
    //  400 (Not all necessary fields are present)
    //  500 (Could not make this post)
    describe("POST /api/createpost", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("returns 201 if post was created", async () => {
            mockDb.collection.insertOne.mockResolvedValue({ 
                acknowledged: true,
                insertedId: new ObjectId(123456),
            });

            const response = await request(app)
                .post("/api/createpost")
                .send({
                    _id: new ObjectId(123456),
                    title: "Test Post",
                    body: "testing testing 123",
                    image: "test-image.png",
                    latitude: -70.00,
                    authorId: mockUser._id,
                    longitude: 70.00,
                    tags: ["test"],
                    createdAt: new Date(),
                });

            expect(response.status).toBe(201);
            expect(response.body).toEqual({ message: "Successfully made post" });
        });

        it("returns 400 if post fields are not all filled in", async () => {
            const response = await request(app)
                .post("/api/createpost")
                .send({ title: "Test Post" });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: "Not all necessary fields are present" });
        });

        it("returns 500 if post could not be made", async () => {
            //mock insert fail
            mockDb.collection.insertOne.mockImplementationOnce(() => {
                throw new Error("Insert failed");
            });

            const response = await request(app)
                .post("/api/createpost")
                .send({
                    _id: new ObjectId(123456),
                    title: "Test Post",
                    body: "testing testing 123",
                    image: "test-image.png",
                    latitude: -70.00,
                    authorId: mockUser._id,
                    longitude: 70.00,
                    tags: ["test"],
                    createdAt: new Date(),
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "Could not make this post" });
        });
    });

    // get post/reply test
    //  200 ()
    //  404 (Post or reply not found)
    //  500 (Couldn't get post or reply)
    describe("GET /api/posts/:_id", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("returns 200 if post or reply was found", async () => {
            const mockPost = {
                _id: new ObjectId(123456),
                title: "Test Post",
                body: "testing testing 123",
                image: "test-image.png",
                authorId: mockUser._id,
            };

            mockDb.collection.find.mockResolvedValue(mockPost);

            const response = await request(app)
                .get("/api/post/:_id")
                .send({ _id: new ObjectId(123456) });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockPost);
        });

        it("returns 404 if post or reply wasn't found", async () => {
            mockDb.collection.find.mockResolvedValue(null);

            const response = await request(app)
                .get("/api/post/:_id")
                .send({ _id: new ObjectId(123456) });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: "Post or reply not found" });
        });

        it("returns 500 if post or reply could not be searched for", async () => {
            mockDb.collection.find.mockImplementationOnce(() => {
                throw new Error("Find failed");
            });

            const response = await request(app)
                .post("/api/post/:_id")
                .send({ _id: new ObjectId(123456) });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "Couldn't get post or reply" });
        });
    });

    // update post test
    //  200 (Post w/ id _id updated)
    //  400 (No fields provided :()
    //  403 (that aint yo post bruh u cant edit that)
    //  404 (Post not found :()
    //  500 (Failed to update post)
    describe("PUT /api/updatepost", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("returns 200 if post was updated", async () => {
            const mockPost = {
                _id: new ObjectId(123456),
                title: "Original Title",
                body: "original body",
                image: "original-image.png",
                authorId: mockUser._id,
            };

            mockDb.collection.findOne.mockResolvedValue(mockPost)
            mockDb.collection.updateOne.mockResolvedValue({ modifiedCount: 1 });
            
            const response = await request(app)
                .put("/api/updatepost")
                .send({
                    title: "Updated Title",
                    body: "updated body",
                    image: "new-image.png", 
                    updatedAt: new Date(),
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: "Post updated" });
        });

        it("returns 400 if no fields were provided", async () => {
            const response = await request(app)
                .put("/api/updatepost")
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: "No fields provided :(" });
        });

        it("returns 403 if user isn't author", async () => {
            const mockPost = {
                _id: new ObjectId(123456),
                title: "Original Title",
                body: "original body",
                image: "original-image.png",
                authorId: new ObjectId(54321),
            };

            mockDb.collection.findOne.mockResolvedValue(mockPost);

            const response = await request(app)
                .put("/api/updatepost")
                .send({
                    title: "Updated Title",
                    body: "updated body",
                    image: "new-image.png", 
                    updatedAt: new Date(),
                });

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ error: "that aint yo post bruh u cant edit that" });
        });

        it("returns 404 if post wasn't found", async () => {
            mockDb.collection.findOne.mockResolvedValue(null);

            const response = await request(app)
                .put("/api/updatepost")
                .send({
                    title: "Updated Title",
                    body: "updated body",
                    image: "new-image.png", 
                    updatedAt: new Date(),
                });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: "Post not found :(" });
        });

        it("returns 500 post failed to update", async () => {
            mockDb.collection.findOne.mockResolvedValue(mockPost);
            mockDb.collection.updateOne.mockImplementationOnce(() => {
                throw new Error("Update failed");
            });

            const response = await request(app)
                .post("/api/updatepost")
                .send({
                    title: "Updated Title",
                    body: "updated body",
                    image: "new-image.png", 
                    updatedAt: new Date(),
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "Failed to update post" });
        });
    });

    // delete post/reply test
    //  204 (Post or reply  successfully deleted)
    //  403 (that aint yo post or reply bruh u cant delete that)
    //  404 (cant delete a post or reply that doesnt exist) x2
    //  500 (Failed to delete post )
    describe("DELETE /api/deletepost", () => {
        beforeAll(() => {
            const mockPost = {
                _id: new ObjectId(123456),
                title: "Title",
                body: "body",
                image: "image.png",
                authorId: mockUser._id,
            };
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it("returns 204 if post was deleted", async () => {
            mockDb.collection.findOne.mockResolvedValue(mockPost);
            mockDb.collection.deleteOne.mockResolvedValue({ deletedCount: 1 });

            const response = await request(app)
                .delete("/api/deletepost")
                .send({ _id: new ObjectId(123456) });

            expect(response.status).toBe(204);
            expect(response.body).toEqual({ message: "Post or reply deleted" });
        });

        it("returns 403 if user isn't author", async () => {
            const diffMockPost = {
                _id: new ObjectId(123456),
                title: "Title",
                body: "body",
                image: "image.png",
                authorId: new ObjectId(54321),
            };
            
            mockDb.collection.findOne.mockResolvedValue(diffMockPost);

            const response = await request(app)
                .delete("/api/deletepost")
                .send({ _id: new ObjectId(123456) });

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ error: "that aint yo post or reply bruh u cant delete that" });
        });

        it("returns 404 if post wasn't found initially", async () => {
            mockDb.collection.findOne.mockResolvedValue(null);
            
            const response = await request(app)
                .delete("/api/deletepost")
                .send({ _id: new ObjectId(123456) });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: "cant delete a post or reply that doesnt exist" });
        });

        it("returns 404 if post wasn't deleted but was found", async () => {
            mockDb.collection.findOne.mockResolvedValue(mockPost);
            mockDb.collection.deleteOne.mockResolvedValue({ deletedCount: 0 });

            const response = await request(app)
                .delete("/api/deletepost")
                .send({ _id: new ObjectId(123456) });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: "Could not delete - post or reply does not exist" });
        });

        it("returns 500 if delete fails", async () => {
            mockDb.collection.findOne.mockResolvedValue(mockPost);
            mockDb.collection.deleteOne.mockImplementationOnce(() => {
                throw new Error("Delete failed");
            }); 

            const response = await request(app)
                .post("/api/deletepost")
                .send({ _id: new ObjectId(123456) });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "Failed to delete post or reply" });
        });
    });

    //create reply test
    //  201 (Reply successfully created)
    //  400 (Not all necessary fields are present)
    //  500 (Reply could not be made)
    describe("POST /api/createreply", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        const mockPost = {
            _id: new ObjectId(123456),
            title: "Test Post",
            body: "testing testing 123",
            image: "test-image.png",
            latitude: -70.00,
            authorId: mockUser._id,
            longitude: 70.00,
            tags: ["test"],
            createdAt: new Date(),
        };

        it("returns 201 if reply was created", async () => {
            mockDb.collection.insertOne.mockResolvedValue({ 
                acknowledged: true,
                insertedId: new ObjectId(1234567),
            });

            const response = await request(app)
                .post("/api/createreply")
                .send({
                    authorId: new ObjectId(12345678),
                    body: "test reply",
                    image: "reply-image.png",
                    replyTo: mockPost._id,
                });

            expect(response.status).toBe(201);
            expect(response.body).toEqual({ error: "Not all necessary fields are present" });
        });

        it("returns 400 if not all fields are filled in", async () => {
            const response = await request(app)
                .post("/api/createreply")
                .send({ body: "test reply" });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: "Reply successfully created" });
        });

        it("returns 500 if reply could not be created", async () => {
            mockDb.collection.insertOne.mockImplementationOnce(() => {
                throw new Error("Insert failed");
           }); 

            const response = await request(app)
                .post("/api/createreply")
                .send({
                    authorId: new ObjectId(12345678),
                    body: "test reply",
                    image: "reply-image.png",
                    replyTo: mockPost._id,
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "Reply could not be made" });
        });
    });

    // update reply test
    //  200 (Reply  updated)
    //  400 (No fields provided :()
    //  403 (you cant update a reply that isnt yours silly)
    //  404 (Reply not found :()
    //  500 (Failed to update reply )
    describe("PUT /api/updatereply", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        const mockPost = {
            _id: new ObjectId(123456),
            title: "Test Post",
            body: "testing testing 123",
            image: "test-image.png",
            latitude: -70.00,
            authorId: mockUser._id,
            longitude: 70.00,
            tags: ["test"],
            createdAt: new Date(),
        };

        it("returns 200 if the reply was updated", async () => {
            const mockReply = {
                _id: new ObjectId(12345678),
                authorId: new ObjectId(12345),
                body: "test reply",
                image: "reply-image.png",
                replyTo: mockPost._id,
            };

            mockDb.collection.findOne.mockResolvedValue(mockReply)
            mockDb.collection.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const response = await request(app)
                .put("/api/updatereply")
                .send({
                    body: "updated body",
                    image: "new-image.png", 
                    updatedAt: new Date(),
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: "Reply updated" });

            expect(mockDb.collection.updateOne).toHaveBeenCalledWith(
                { _id: new ObjectId(_id) },
                {
                  $set: {
                    body: "updated body",
                    image: "new-image.png", 
                    updatedAt: new Date(),
                  },
                }
            );
        });

        it("returns 400 if no fields were filled in", async () => {
            const response = await request(app)
                .put("/api/updatereply")
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: "No fields provided :(" });
        });

        it("returns 403 if user isn't author", async () => {
            const mockReply = {
                _id: new ObjectId(12345678),
                authorId: new ObjectId(54321),
                body: "test reply",
                image: "reply-image.png",
                replyTo: mockPost._id,
            };

            mockDb.collection.findOne.mockResolvedValue(mockReply)

            const response = await request(app)
                .put("/api/updatereply")
                .send({
                    body: "updated body",
                    image: "new-image.png", 
                    updatedAt: new Date(),
                });

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ error: "you cant update a reply that isnt yours silly" });
        });

        it("returns 404 if reply doesn't exist", async () => {
            mockDb.collection.findOne.mockResolvedValue(null)

            const response = await request(app)
                .put("/api/updatereply")
                .send({
                    body: "updated body",
                    image: "new-image.png", 
                    updatedAt: new Date(),
                });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: "Reply not found :(" });
        });

        it("returns 500 if reply could not be updated", async () => {
            mockDb.collection.findOne.mockResolvedValue(mockPost);
            mockDb.collection.updateOne.mockImplementationOnce(() => {
                throw new Error("Update failed");
            });

            const response = await request(app)
                .post("/api/updatereply")
                .send({
                    body: "updated body",
                    image: "new-image.png", 
                    updatedAt: new Date(),
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "Failed to update reply" });
        });
    });

    // search posts/replies test
    //  200 (Posts and or replies were found OR No posts or replies were found)
    //  500 (Failed to search for posts and or replies)
    describe("POST /api/searchposts", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("returns 200 if posts or replies were found", async () => {
            const mockPost1 = {
                _id: new ObjectId(123456),
                title: "Test Post 1",
                body: "testing testing 123",
                image: "test-image1.png",
                latitude: -70.00,
                authorId: mockUser._id,
                longitude: 70.00,
                tags: ["test"],
                createdAt: new Date(),
            };

            const mockPost2 = {
                _id: new ObjectId(1234567),
                title: "Test Post 2",
                body: "testing testing 321",
                image: "test-image2.png",
                latitude: -77.00,
                authorId: mockUser._id,
                longitude: 77.00,
                tags: ["test"],
                createdAt: new Date(),
            };

            const postArr = [mockPost1, mockPost2];
            const tagsArr = ["test1", "test2"];
            const returnArr = postArr.concat(tagsArr);

            mockDb.collection.find.mockResolvedValue(postArr).mockResolvedValue(tagsArr);

            const response = await request(app)
                .post("/api/searchposts")
                .send({
                    title: "Test Post",
                    body: "testing",
                    authorId: mockUser._id,
                    tags: ["test"],
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(returnArr);
        });

        it("returns 200 if no posts or replies were found", async () => {
            mockDb.collection.find.mockResolvedValue(null);

            const response = await request(app)
                .post("/api/searchposts")
                .send({
                    title: "Test Post",
                    body: "testing",
                    authorId: mockUser._id,
                    tags: ["test"],
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it("returns 500 if search fails", async () => {
            mockDb.collection.find.mockImplementationOnce(() => {
                throw new Error("Search failed");
            }); 

            const response = await request(app)
                .post("/api/")
                .send({
                    title: "Test Post",
                    body: "testing",
                    authorId: mockUser._id,
                    tags: ["test"],
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "Failed to search for posts and or replies" });
        });
    });

    // get local posts test
    //  200 (Local posts found OR No local posts found)
    //  400 (Not all necessary fields are present)
    //  500 (Could not get local posts)
    describe("POST /api/getlocalposts", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        const mockPost1 = {
            _id: new ObjectId(123456),
            title: "Test Post 1",
            body: "testing testing 123",
            image: "test-image1.png",
            latitude: -70.00,
            authorId: mockUser._id,
            longitude: 70.00,
            tags: ["test"],
            createdAt: new Date(),
        };

        const mockPost2 = {
            _id: new ObjectId(1234567),
            title: "Test Post 2",
            body: "testing testing 321",
            image: "test-image2.png",
            latitude: -77.00,
            authorId: mockUser._id,
            longitude: 77.00,
            tags: ["test"],
            createdAt: new Date(),
        };

        const postArr = [mockPost1, mockPost2];

        it("returns 200 if local posts were found", async () => {
            mockDb.collection.find.mockResolvedValue(postArr);

            const response = await request(app)
                .get("/api/getlocalposts")
                .send({
                    latitude: -73.50,
                    longitude: 73.50,
                    distance: 5.00,
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(postArr);
        });

        it("returns 200 if no local posts were found", async () => {
            mockDb.collection.find.mockResolvedValue(null);

            const response = await request(app)
                .get("/api/getlocalposts")
                .send({
                    latitude: -73.50,
                    longitude: 73.50,
                    distance: 5.00,
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it("returns 400 if not all fields were filled in", async () => {
            const response = await request(app)
                .get("/api/getlocalposts")
                .send({ distance: 5.00 });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: "Not all necessary fields are present" });
        });

        it("returns 500 if local search fails", async () => {
            mockDb.collection.find.mockImplementationOnce(() => {
                throw new Error("Search failed");
           }); 

            const response = await request(app)
                .post("/api/getlocalposts")
                .send({
                    latitude: -73.50,
                    longitude: 73.50,
                    distance: 5.00,
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "Could not get local posts" });
        });
    });

    // get replies test
    //  200 (Replies found
    //  204 (No replies found)
    //  404 (No original post found: cannot get replies)
    //  500 (Failed to get replies for post )
    describe("POST /api/posts/:_id/getreplies", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        const mockPost = {
            _id: new ObjectId(123456),
            title: "Test Post",
            body: "testing testing 123",
            image: "test-image.png",
            latitude: -70.00,
            authorId: mockUser._id,
            longitude: 70.00,
            tags: ["test"],
            createdAt: new Date(),
        };

        it("returns 200 if replies were found", async () => {
            const mockReply1 = {
                _id: new ObjectId(1234567),
                authorId: new ObjectId(12345),
                body: "test reply",
                image: "reply-image.png",
                replyTo: mockPost._id,
            };

            const mockReply2 = {
                _id: new ObjectId(12345678),
                authorId: new ObjectId(12345),
                body: "test reply",
                image: "reply-image.png",
                replyTo: mockPost._id,
            };

            const replyArr = [mockReply1, mockReply2];

            mockDb.collection.findOne.mockResolvedValue(mockPost);
            mockDb.collection.find.mockResolvedValue(replyArr);

            const response = await request(app)
                .post("/api/posts/:_id/getreplies")
                .send({ _id: mockPost._id });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(replyArr);
        });

        it("returns 204 if no replies were found", async () => {
            mockDb.collection.findOne.mockResolvedValue(mockPost);
            mockDb.collection.find.mockResolvedValue(null);

            const response = await request(app)
                .post("/api/posts/:_id/getreplies")
                .send({ _id: mockPost._id });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: "No replies found" });
        });

        it("returns 404 if original post wasn't found", async () => {
            mockDb.collection.findOne.mockResolvedValue(null);

            const response = await request(app)
                .post("/api/posts/:_id/getreplies")
                .send({ _id: mockPost._id });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: "No original post found: cannot get replies" });
        });

        it("returns 500 if replies could not be found", async () => {
            mockDb.collection.findOne.mockResolvedValue(mockPost);
            mockDb.collection.find.mockImplementationOnce(() => {
                throw new Error("Reply search failed");
           }); 

            const response = await request(app)
                .post("/api/")
                .send({ _id: mockPost._id });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "Failed to get replies for post" });
        });
    });

    // get pins test
    //  200 (Pins found OR No pins found)
    //  400 (Not all necessary fields are present)
    //  500 (Could not get pins)
    describe("GET /api/getpins", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        const mockPost1 = {
            _id: new ObjectId(123456),
            title: "Test Post 1",
            body: "testing testing 123",
            image: "test-image1.png",
            latitude: -70.00,
            authorId: mockUser._id,
            longitude: 70.00,
            tags: ["test"],
            createdAt: new Date(),
        };

        const mockPost2 = {
            _id: new ObjectId(1234567),
            title: "Test Post 2",
            body: "testing testing 321",
            image: "test-image2.png",
            latitude: -77.00,
            authorId: mockUser._id,
            longitude: 77.00,
            tags: ["test"],
            createdAt: new Date(),
        };

        const postArr = [mockPost1, mockPost2];

        it("returns 200 if pins were found", async () => {
            mockDb.collection.find.mockResolvedValue(postArr);

            const mockGeometry = {
                type: "Point",
                coordinates: [],
            };

            const mockProperties1 = {
                id: mockPost1._id,
                title: mockPost1.title,
                body: mockPost1.body,
                author: mockPost1.authorId,
            };

            const mockProperties2 = {
                id: mockPost2._id,
                title: mockPost2.title,
                body: mockPost2.body,
                author: mockPost2.authorId,
            };

            const mockPin1 = {
                type: "Feature",
                geometry: mockGeometry,
                properties: mockProperties1,
            };

            const mockPin2 = {
                type: "Feature",
                geometry: mockGeometry,
                properties: mockProperties2,
            };

            const pinArr = [mockPin1, mockPin2];

            const response = await request(app)
                .post("/api/getpins")
                .send({
                    latitude: -73.50,
                    longitude: 73.50,
                    distance: 5.00,
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(pinArr);
        });

        it("returns 200 if no pins were found", async () => {
            mockDb.collection.find.mockResolvedValue(null);

            const response = await request(app)
                .post("/api/getpins")
                .send({
                    latitude: -73.50,
                    longitude: 73.50,
                    distance: 5.00,
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it("returns 400 if not all fields were filled in", async () => {
            const response = await request(app)
                .get("/api/getlocalposts")
                .send({ distance: 5.00 });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: "Not all necessary fields are present" });
        });

        it("returns 500 if pins could not be found", async () => {
            mockDb.collection.find.mockImplementationOnce(() => {
                throw new Error("Pin search failed");
           }); 

            const response = await request(app)
                .post("/api/getpins")
                .send({
                    latitude: -73.50,
                    longitude: 73.50,
                    distance: 5.00,
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "Could not get pins" });
        });
    });
});

describe("user API", () => {
    // authenticate user test
    //  200 (Authenticated)
    //  401 (Authentication fails)
    describe("POST /api/authenticate", () => {
        beforeEach(() => {
            const mockUser = {
                _id: new ObjectId(12345),
                username: "JSmith",
                password: "password",
                firstName: "John",
                lastName: "Smith",
                email: "johnsmith123@gmail.com",
                image: "profile-pic.png"
            };
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it("returns 200 if authentication succeeds", async () => {
            const response = await request(app)
                .post("/api/authenticate")
                .send({ body: new ObjectId(12345) });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: "Authenticated" });
        });

        it("returns 401 if authentication fails", async () => {
            const response = await request(app)
                .post("/api/authenticate")
                .send({ body: new ObjectId(54321) });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: "Authentication failed" });
        });
    });

    // login test
    //  200 (User w/ id userId logged in)
    //  400 (not all login fields were filled in vro)
    //  401 (invalid credz)
    //  500 (server error while tryna login)
    describe("POST /api/login", () => {
        beforeEach(() => {
            const mockUser = {
                _id: new ObjectId(12345),
                username: "JSmith",
                password: "password",
                firstName: "John",
                lastName: "Smith",
                email: "johnsmith123@gmail.com",
                image: "profile-pic.png"
            };
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it("returns 200 if user was logged in", async () => {
            mockDb.collection.findOne.mockResolvedValue(mockUser);

            const response = await request(app)
                .post("/api/login")
                .send({
                    login: "Jsmith",
                    password: "password",
                });

            const token = jwt.sign(
                {
                    userId: mockUser._id,
                    username: mockUser.username,
                    email: mockUser.email,
                },
                JWT_SECRET,
                { expiresIn: "1h" }
            );

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                token,
                userId: mockUser._id,
                message: "User logged in",
            });
        });

        it("returns 400 if not all login info was filled in", async () => {
            const response = await request(app)
                .post("/api/login")
                .send({ login: "JSmith" });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: "not all login fields were filled in vro" });
        });

        it("returns 401 if the login info was incorrect", async () => {
            mockDb.collection.findOne.mockResolvedValue(null);

            const response = await request(app)
                .post("/api/login")
                .send({
                    login: "NotJSmith",
                    password: "WrongPassword",
                });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: "invalid credz" });
        });

        it("returns 500 if login fails", async () => {
            mockDb.collection.findOne.mockImplementationOnce(() => {
                throw new Error("Login failed");
            }); 

            const response = await request(app)
                .post("/api/")
                .send({
                    login: "Jsmith",
                    password: "password",
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "server error while tryna login" });
        });
    });

    // user endpoints unit testing
    // register user test
    //  201 (User registered successfully >W<)
    //  400 (Missing some register fields :(()
    //  409 (username already exists! OR email has already been registered to an account)
    //  500 (A servar ewwow happend ;()
    describe("POST /api/registeruser", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("returns 201 if user was created", async () => {
            mockDb.collection.findOne.mockResolvedValue(null);
            mockDb.collection.insertOne.mockResolvedValue({ 
                acknowledged: true,
                insertedId: new ObjectId(12345),
            });

            const response = await request(app)
                .post("/api/registeruser")
                .send({
                    username: "JSmith",
                    password: "password",
                    firstName: "John",
                    lastName: "Smith",
                    email: "johnsmith123@gmail.com",
                });

            expect(response.status).toBe(201);
            expect(response.body).toEqual({ message: "User registered successfully >W<" });
        });

        it("returns 400 if all fields aren't filled in", async () => {
            const response = await request(app)
                .post("/api/registeruser")
                .send({ username: "JSmith" });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: "Missing some register fields :((" });
        });

        it("returns 409 if username already exists", async () => {
            const mockUser = {
                _id: new ObjectId(12345),
                username: "JSmith",
            };

            mockDb.collection.findOne.mockResolvedValue(mockUser);

            const response = await request(app)
                .post("/api/registeruser")
                .send({
                    username: "JSmith",
                    password: "password",
                    firstName: "John",
                    lastName: "Smith",
                    email: "johnsmith123@gmail.com",
                });

            expect(response.status).toBe(409);
            expect(response.body).toEqual({ error: "username already exists!" });
        });

        it("returns 409 if email is in use", async () => {
            const mockUser = {
                _id: new ObjectId(12345),
                email: "johnsmith123@gmail.com",
            };
            
            mockDb.collection.findOne.mockResolvedValue(mockUser);

            const response = await request(app)
                .post("/api/registeruser")
                .send({
                    username: "JSmith",
                    password: "password",
                    firstName: "John",
                    lastName: "Smith",
                    email: "johnsmith123@gmail.com",
                });

            expect(response.status).toBe(409);
            expect(response.body).toEqual({ error: "email has already been registered to an account" });
        });

        it("returns 500 if register fails", async () => {
            mockDb.collection.findOne.mockResolvedValue(null);
            mockDb.collection.insertOne.mockImplementationOnce(() => {
                throw new Error("Insert user failed");
            }); 

            const response = await request(app)
                .post("/api/")
                .send({
                    username: "JSmith",
                    password: "password",
                    firstName: "John",
                    lastName: "Smith",
                    email: "johnsmith123@gmail.com",
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "A servar ewwow happend ;(" });
        });
    });

    // get user test
    //  200 (User  found)
    //  404 (User not found :()
    //  500 (couldnt fetch user details of user  wtf!!)
    describe("GET /api/users/:_id", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("returns 200 if user was found", async () => {
            const mockUser = {
                _id: new ObjectId(12345),
                username: "JSmith",
                password: "password",
                firstName: "John",
                lastName: "Smith",
                email: "johnsmith123@gmail.com",
                image: "profile-pic.png"
            };

            mockDb.collection.findOne.mockResolvedValue(mockUser);

            const response = await request(app)
                .get("/api/user/:_id")
                .send({ _id: new ObjectId(12345) });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockUser);
        });

        it("returns 404 if user was not found", async () => {
            mockDb.collection.findOne.mockResolvedValue(null);

            const response = await request(app)
                .get("/api/user/:_id")
                .send({ _id: new ObjectId(12345) });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: "User not found :(" });
        });

        it("returns 500 if fails", async () => {
            mockDb.collection.findOne.mockImplementationOnce(() => {
                throw new Error("Find user failed");
            }); 

            const response = await request(app)
                .post("/api/")
                .send({ _id: new ObjectId(12345) });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "couldnt fetch user details wtf!!" });
        });
    });

    // update user test
    //  200 (updated dat user  x3)
    //  400 (you need to provide a field to update bruh OR bro yo email format fricked up)
    //  403 (you cant update a profile that isnt yours >:()
    //  404 (User not found :()
    //  500 (couldnt update user  wtf hapepnd)
    describe("PUT /api/updateuser/:_id", () => {
        beforeEach(() => {
            const mockUser = {
                _id: new ObjectId(12345),
                username: "JSmith",
                password: "password",
                firstName: "John",
                lastName: "Smith",
                email: "johnsmith123@gmail.com",
                image: "profile-pic.png"
            };
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it("returns 200 if user info was updated", async () => {
            mockDb.collection.findOne.mockResolvedValue(mockUser);
            mockDb.collection.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const response = await request(app)
                .put("/api/updateuser/:_id")
                .send({
                    _id: new ObjectId(12345),
                    firstName: "Smith",
                    lastName: "John",
                    email: "newemail@gmail.com",
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: "updated dat user x3" });
        });

        it("returns 400 if no info to update was provided", async () => {
            const response = await request(app)
                .put("/api/updateuser/:_id")
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: "you need to provide a field to update bruh" });
        });

        it("returns 400 if email is not formatted right", async () => {
            const response = await request(app)
                .put("/api/updateuser/:_id")
                .send({ 
                    _id: new ObjectId(12345),
                    email: "",
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: "bro yo email format fricked up" });
        });

        it("returns 403 if current user is not the user being updated", async () => {
            const response = await request(app)
                .put("/api/updateuser/:_id")
                .send({
                    _id: new ObjectId(54321),
                    firstName: "Smith",
                    lastName: "John",
                    email: "newemail@gmail.com",
                });

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ error: "you cant update a profile that isnt yours >:(" });
        });

        it("returns 404 if user wasn't found", async () => {
            mockDb.collection.findOne.mockResolvedValue(null);

            const response = await request(app)
                .put("/api/updateuser/:_id")
                .send({
                    _id: new ObjectId(54321),
                    firstName: "Smith",
                    lastName: "John",
                    email: "newemail@gmail.com",
                });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: "User not found :(" });
        });

        it("returns 500 if fails", async () => {
            mockDb.collection.findOne.mockResolvedValue(mockUser);
            mockDb.collection.updateOne.mockImplementationOnce(() => {
                throw new Error("Update user failed");
            }); 

            const response = await request(app)
                .post("/api/")
                .send({
                    _id: new ObjectId(12345),
                    firstName: "Smith",
                    lastName: "John",
                    email: "newemail@gmail.com",
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "couldnt update user wtf hapepnd" });
        });
    });

    // delete user test
    //  204 (BOOM! Account and all related content deleted! for id: _id)
    //  400 (confirm password for account deletion)
    //  401 (password is wrong)
    //  403 (can only delete your own account)
    //  404 (user not found :()
    //  500 (Couldnt delete user  idk why...)
    // describe("DELETE /api/deleteuser/:_id", () => {
    //     afterEach(() => {
    //         jest.clearAllMocks();
    //     });
    //
    //     it("returns 204 if account and related content was deleted", async () => {
    //         const response = await request(app)
    //             .delete("/api/deleteuser/:_id")
    //             .send({});
    //
    //         expect(response.status).toBe(204);
    //         expect(response.body).toEqual({});
    //     });
    //
    //     it("returns 400 if password is not provided", async () => {
    //         const response = await request(app)
    //             .delete("/api/deleteuser/:_id")
    //             .send({});
    //
    //         expect(response.status).toBe(400);
    //         expect(response.body).toEqual({});
    //     });
    //
    //     it("returns 401 if password is incorrect", async () => {
    //         const response = await request(app)
    //             .delete("/api/deleteuser/:_id")
    //             .send({});
    //
    //         expect(response.status).toBe(401);
    //         expect(response.body).toEqual({});
    //     });
    //
    //     it("returns 403 if current user is not the user being deleted", async () => {
    //         const response = await request(app)
    //             .delete("/api/deleteuser/:_id")
    //             .send({});
    //
    //         expect(response.status).toBe(403);
    //         expect(response.body).toEqual({});
    //     });
    //
    //     it("returns 404 if user wasn't found", async () => {
    //         const response = await request(app)
    //             .delete("/api/deleteuser/:_id")
    //             .send({});
    //
    //         expect(response.status).toBe(404);
    //         expect(response.body).toEqual({});
    //     });
    //
    //     it("returns 500 if fails", async () => {
    //         const response = await request(app)
    //             .post("/api/")
    //             .send({});
    //
    //         expect(response.status).toBe(500);
    //         expect(response.body).toEqual({});
    //     });
    // });
});