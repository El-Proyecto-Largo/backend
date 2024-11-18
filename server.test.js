import { request } from "supertest";
import app from "./server.js";

// post/reply endpoints unit testing
// create post test
//  201 (Successfully made post)
//  400 (Not all necessary fields are present)
//  500 (Could not make this post)
describe("POST /api/createpost", () => {
    it("returns 201 if post was created", async () => {
        const response = await request(app)
            .post("/api/createpost")
            .send({});

        expect(response.status).toBe(201);
        expect(response.body).toEqual("");
    });

    it("returns 400 if post fields are not all filled in", async () => {
        const response = await request(app)
            .post("/api/createpost")
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual("");
    });
});

// get post/reply test
//  200 (Post or reply w/ id: _id found)
//  404 (Post or reply not found)
//  500 (Couldn't get post or reply w/ id: _id)
describe("GET /api/posts/:_id", () => {
    it("returns 200 if post or reply was found", async () => {
        const response = await request(app)
            .get("/api/post/:_id")
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual("");
    });

    it("returns 404 if post or reply wasn't found", async () => {
        const response = await request(app)
            .get("/api/post/:_id")
            .send({});

        expect(response.status).toBe(404);
        expect(response.body).toEqual("");
    });
});

// update post test
//  200 (Post w/ id _id updated)
//  400 (No fields provided :()
//  403 (that aint yo post bruh u cant edit that)
//  404 (Post not found :()
//  500 (Failed to update post w/ id: _id)
describe("PUT /api/updatepost", () => {
    it("returns 200 if post was updated", async () => {
        const response = await request(app)
            .put("/api/updatepost")
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual("");
    });

    it("returns 400 if no fields were provided", async () => {
        const response = await request(app)
            .put("/api/updatepost")
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual("");
    });

    it("returns 403 if user isn't author", async () => {
        const response = await request(app)
            .put("/api/updatepost")
            .send({});

        expect(response.status).toBe(403);
        expect(response.body).toEqual("");
    });

    it("returns 404 if post wasn't found", async () => {
        const response = await request(app)
            .put("/api/updatepost")
            .send({});

        expect(response.status).toBe(404);
        expect(response.body).toEqual("");
    });
});

// delete post/reply test
//  204 (Post or reply w/ id: _id successfully deleted)
//  403 (that aint yo post or reply bruh u cant delete that)
//  404 (cant delete a post or reply that doesnt exist) x2
//  500 (Failed to delete post w/ id: _id)
describe("DELETE /api/deletepost", () => {
    it("returns 204 if post was deleted", async () => {
        const response = await request(app)
            .delete("/api/deletepost")
            .send({});

        expect(response.status).toBe(204);
        expect(response.body).toEqual("");
    });

    it("returns 403 if user isn't author", async () => {
        const response = await request(app)
            .delete("/api/deletepost")
            .send({});

        expect(response.status).toBe(403);
        expect(response.body).toEqual("");
    });

    it("returns 404 if post wasn't found", async () => {
        const response = await request(app)
            .delete("/api/deletepost")
            .send({});

        expect(response.status).toBe(404);
        expect(response.body).toEqual("");
    });
});

//create reply test
//  201 (Reply successfully created)
//  400 (Not all necessary fields are present)
//  500 (Reply could not be made)
describe("POST /api/createreply", () => {
    it("returns 201 if reply was created", async () => {
        const response = await request(app)
            .post("/api/createreply")
            .send({});

        expect(response.status).toBe(201);
        expect(response.body).toEqual("");
    });

    it("returns 400 if not all fields are filled in", async () => {
        const response = await request(app)
            .post("/api/createreply")
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual("");
    });
});

// update reply test
//  200 (Reply w/ id: _id updated)
//  400 (No fields provided :()
//  403 (you cant update a reply that isnt yours silly)
//  404 (Reply not found :()
//  500 (Failed to update reply w/ id: _id)
describe("PUT /api/updatereply", () => {
    it("returns 200 if the reply was updated", async () => {
        const response = await request(app)
            .put("/api/updatereply")
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual("");
    });

    it("returns 400 if no fields were filled in", async () => {
        const response = await request(app)
            .put("/api/updatereply")
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual("");
    });

    it("returns 403 if user isn't author", async () => {
        const response = await request(app)
            .put("/api/updatereply")
            .send({});

        expect(response.status).toBe(403);
        expect(response.body).toEqual("");
    });

    it("returns 404 if reply doesn't exist", async () => {
        const response = await request(app)
            .put("/api/updatereply")
            .send({});

        expect(response.status).toBe(404);
        expect(response.body).toEqual("");
    });
});

// search posts/replies test
//  200 (Posts and or replies were found)
//  204 (No posts or replies were found)
//  500 (Failed to search for posts and or replies)
describe("POST /api/searchposts", () => {
    it("returns 200 if posts or replies were found", async () => {
        const response = await request(app)
            .post("/api/searchposts")
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual("");
    });

    it("returns 204 if no posts or replies were found", async () => {
        const response = await request(app)
            .post("/api/searchposts")
            .send({});

        expect(response.status).toBe(204);
        expect(response.body).toEqual("");
    });
});

// get pins test
// get local posts test
//  200 (Local posts found)
//  204 (No local posts were found)
//  400 (Not all necessary fields are present)
//  500 (Could not get local posts)
describe("POST /api/getlocalposts", () => {
    it("returns 200 if local posts were found", async () => {
        const response = await request(app)
            .get("/api/getpins")
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual("");
    });

    it("returns 204 if no local posts were found", async () => {
        const response = await request(app)
            .get("/api/getpins")
            .send({});

        expect(response.status).toBe(204);
        expect(response.body).toEqual("");
    });

    it("returns 400 if not all fields were filled in", async () => {
        const response = await request(app)
            .get("/api/getpins")
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual("");
    });
});

// get replies test
//  200 (Replies found)
//  204 (No replies found)
//  404 (No original post found: cannot get replies)
//  500 (Failed to get replies for post w/ id: _id)
describe("POST /api/posts/:_id/getreplies", () => {
    it("returns 200 if replies were found", async () => {
        const response = await request(app)
            .post("/api/posts/:_id/getreplies")
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual("");
    });

    it("returns 204 if no replies were found", async () => {
        const response = await request(app)
            .post("/api/posts/:_id/getreplies")
            .send({});

        expect(response.status).toBe(204);
        expect(response.body).toEqual("");
    });

    it("returns 404 if original post wasn't found", async () => {
        const response = await request(app)
            .post("/api/posts/:_id/getreplies")
            .send({});

        expect(response.status).toBe(404);
        expect(response.body).toEqual("");
    });
});

// get pins test
//  200 (Pins found)
//  204 (No posts to pin)
//  500 (Could not get pins)
describe("GET /api/getpins", () => {
    it("returns 200 if pins were found", async () => {
        const response = await request(app)
            .post("/api/getlocalposts")
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual("");
    });

    it("returns 204 if no posts to pin were found", async () => {
        const response = await request(app)
            .post("/api/getlocalposts")
            .send({});

        expect(response.status).toBe(204);
        expect(response.body).toEqual("");
    });
});

// authenticate user test
//  200 (Authenticated)
//  401 (Authentication fails)
describe("POST /api/authenticate", () => {
    it("returns 200 if authentication succeeds", async () => {
        const response = await request(app)
            .post("/api/authenticate")
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual("");
    });

    it("returns 401 if authentication fails", async () => {
        const response = await request(app)
            .post("/api/authenticate")
            .send({});

        expect(response.status).toBe(401);
        expect(response.body).toEqual("");
    });
});

// login test
//  200 (User w/ id userId logged in)
//  400 (not all login fields were filled in vro)
//  401 (invalid credz)
//  500 (server error while tryna login)
describe("POST /api/login", () => {
    it("returns 200 if user was logged in", async () => {
        const response = await request(app)
            .post("/api/login")
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual("");
    });

    it("returns 400 if not all login info was filled in", async () => {
        const response = await request(app)
            .post("/api/login")
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual("");
    });

    it("returns 401 if the login info was incorrect", async () => {
        const response = await request(app)
            .post("/api/login")
            .send({});

        expect(response.status).toBe(401);
        expect(response.body).toEqual("");
    });
});

// user endpoints unit testing
// register user test
//  201 (User registered successfully >W<)
//  400 (Missing some register fields :(()
//  409 (username already exists! OR email has already been registered to an account)
//  500 (A servar ewwow happend ;()
describe("POST /api/registeruser", () => {
    it("returns 201 if user was created", async () => {
        const response = await request(app)
            .post("/api/registeruser")
            .send({});

        expect(response.status).toBe(201);
        expect(response.body).toEqual("");
    });

    it("returns 400 if all fields aren't filled in", async () => {
        const response = await request(app)
            .post("/api/registeruser")
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual("");
    });

    it("returns 409 if username exists or email is in use", async () => {
        const response = await request(app)
            .post("/api/registeruser")
            .send({});

        expect(response.status).toBe(409);
        expect(response.body).toEqual("");
    });
});

// get user test
//  200 (User w/ id: _id found)
//  404 (User not found :()
//  500 (couldnt fetch user details of user w/ id: _id wtf!!)
describe("GET /api/users/:_id", () => {
    it("returns 200 if user was found", async () => {
        const response = await request(app)
            .get("/api/user/:_id")
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual("");
    });

    it("returns 404 if user was not found", async () => {
        const response = await request(app)
            .get("/api/user/:_id")
            .send({});

        expect(response.status).toBe(404);
        expect(response.body).toEqual("");
    });
});

// update user test
//  200 (updated dat user w/ id: _id x3)
//  400 (you need to provide a field to update bruh OR bro yo email format fricked up)
//  403 (you cant update a profile that isnt yours >:()
//  404 (User not found :()
//  500 (couldnt update user w/ id: _id wtf hapepnd)
describe("PUT /api/updateuser/:_id", () => {
    it("returns 200 if user info was updated", async () => {
        const response = await request(app)
            .put("/api/updateuser/:_id")
            .send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual("");
    });

    it("returns 400 if no info to update was provided", async () => {
        const response = await request(app)
            .put("/api/updateuser/:_id")
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual("");
    });

    it("returns 403 if current user is not the user being updated", async () => {
        const response = await request(app)
            .put("/api/updateuser/:_id")
            .send({});

        expect(response.status).toBe(403);
        expect(response.body).toEqual("");
    });

    it("returns 404 if user wasn't found", async () => {
        const response = await request(app)
            .put("/api/updateuser/:_id")
            .send({});

        expect(response.status).toBe(404);
        expect(response.body).toEqual("");
    });
});

// delete user test
//  204 (BOOM! Account and all related content deleted! for id: _id)
//  400 (confirm password for account deletion)
//  401 (password is wrong)
//  403 (can only delete your own account)
//  404 (user not found :()
//  500 (Couldnt delete user w/ id: _id idk why...)
// describe("DELETE /api/deleteuser/:_id", () => {
//     it("returns 204 if account and related content was deleted", async () => {
//         const response = await request(app)
//             .delete("/api/deleteuser/:_id")
//             .send({});
//
//         expect(response.status).toBe(204);
//         expect(response.body).toEqual("");
//     });
//
//     it("returns 400 if password is not provided", async () => {
//         const response = await request(app)
//             .delete("/api/deleteuser/:_id")
//             .send({});
//
//         expect(response.status).toBe(400);
//         expect(response.body).toEqual("");
//     });
//
//     it("returns 401 if password is incorrect", async () => {
//         const response = await request(app)
//             .delete("/api/deleteuser/:_id")
//             .send({});
//
//         expect(response.status).toBe(401);
//         expect(response.body).toEqual("");
//     });
//
//     it("returns 403 if current user is not the user being deleted", async () => {
//         const response = await request(app)
//             .delete("/api/deleteuser/:_id")
//             .send({});
//
//         expect(response.status).toBe(403);
//         expect(response.body).toEqual("");
//     });
//
//     it("returns 404 if user wasn't found", async () => {
//         const response = await request(app)
//             .delete("/api/deleteuser/:_id")
//             .send({});
//
//         expect(response.status).toBe(404);
//         expect(response.body).toEqual("");
//     });
// });