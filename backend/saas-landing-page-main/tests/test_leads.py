def set_stage(client, headers, lead_id, stage, status):
    return client.patch(
        f"/api/leads/{lead_id}/stages/{stage}", headers=headers, json={"status": status}
    )


def test_list_includes_stages_and_derived_status(client, headers, make_lead):
    lead_id = make_lead()
    item = client.get("/api/leads", headers=headers).json()["items"][0]
    assert item["id"] == lead_id
    assert item["status"] == "pending"
    assert [(s["stage"], s["status"]) for s in item["stages"]] == [
        ("backend", "pending"),
        ("frontend", "pending"),
        ("deployment", "pending"),
    ]


def test_status_is_derived(client, headers, make_lead):
    lead_id = make_lead()
    status = lambda: client.get(f"/api/leads/{lead_id}", headers=headers).json()["status"]  # noqa: E731
    set_stage(client, headers, lead_id, "backend", "in_progress")
    assert status() == "in_progress"
    for stage in ("backend", "frontend", "deployment"):
        set_stage(client, headers, lead_id, stage, "completed")
    assert status() == "completed"
    set_stage(client, headers, lead_id, "deployment", "pending")
    assert status() == "in_progress"


def test_filter_by_status(client, headers, make_lead):
    a = make_lead(email="a@example.com")
    b = make_lead(email="b@example.com")
    c = make_lead(email="c@example.com")
    set_stage(client, headers, b, "backend", "in_progress")
    for stage in ("backend", "frontend", "deployment"):
        set_stage(client, headers, c, stage, "completed")

    def ids(status):
        resp = client.get("/api/leads", headers=headers, params={"status": status})
        return [i["id"] for i in resp.json()["items"]]

    assert ids("pending") == [a]
    assert ids("in_progress") == [b]
    assert ids("completed") == [c]
    assert client.get("/api/leads", headers=headers, params={"status": "bogus"}).status_code == 422


def test_search_by_name_and_email(client, headers, make_lead):
    make_lead(full_name="Asha Rao", email="asha@example.com")
    make_lead(full_name="Vikram Singh", email="vik@acme.io")
    names = lambda q: [  # noqa: E731
        i["full_name"] for i in client.get("/api/leads", headers=headers, params={"q": q}).json()["items"]
    ]
    assert names("asha") == ["Asha Rao"]
    assert names("ACME") == ["Vikram Singh"]
    assert names("%") == []  # wildcard characters are escaped, not interpreted


def test_newest_first_and_pagination(client, headers, make_lead):
    ids = [make_lead(email=f"u{i}@example.com") for i in range(5)]
    page1 = client.get("/api/leads", headers=headers, params={"page_size": 2}).json()
    page3 = client.get("/api/leads", headers=headers, params={"page_size": 2, "page": 3}).json()
    assert page1["total"] == 5
    assert [i["id"] for i in page1["items"]] == [ids[4], ids[3]]
    assert [i["id"] for i in page3["items"]] == [ids[0]]


def test_detail_has_stages_comments_activity(client, headers, make_lead):
    lead_id = make_lead()
    client.post(f"/api/leads/{lead_id}/comments", headers=headers, json={"body": "hello"})
    detail = client.get(f"/api/leads/{lead_id}", headers=headers).json()
    assert len(detail["stages"]) == 3
    assert [c["body"] for c in detail["comments"]] == ["hello"]
    assert [a["action"] for a in detail["activity"]] == ["comment_added", "lead_created"]


def test_unknown_lead_404(client, headers):
    assert client.get("/api/leads/999", headers=headers).status_code == 404
