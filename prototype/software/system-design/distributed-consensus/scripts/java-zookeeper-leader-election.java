// Input:  ZooKeeper cluster connection string
// Output: Leader election using ephemeral sequential znodes
// Deps:   org.apache.zookeeper:zookeeper:3.9.2

import org.apache.zookeeper.*;
import java.util.Collections;
import java.util.List;

public class LeaderElection implements Watcher {
    private ZooKeeper zk;
    private String electionPath = "/election";
    private String myNode;

    public LeaderElection(String connectString) throws Exception {
        this.zk = new ZooKeeper(connectString, 5000, this);
        // Ensure election parent znode exists
        if (zk.exists(electionPath, false) == null) {
            zk.create(electionPath, new byte[0],
                ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.PERSISTENT);
        }
    }

    public void campaign() throws Exception {
        // Create ephemeral sequential znode
        myNode = zk.create(electionPath + "/candidate_",
            new byte[0], ZooDefs.Ids.OPEN_ACL_UNSAFE,
            CreateMode.EPHEMERAL_SEQUENTIAL);

        checkLeadership();
    }

    private void checkLeadership() throws Exception {
        List<String> children = zk.getChildren(electionPath, false);
        Collections.sort(children);
        String smallest = electionPath + "/" + children.get(0);

        if (myNode.equals(smallest)) {
            System.out.println("I am the leader: " + myNode);
            doLeaderWork();
        } else {
            // Watch the node just before me (avoids herd effect)
            int myIndex = children.indexOf(myNode.substring(
                myNode.lastIndexOf('/') + 1));
            String watchNode = electionPath + "/" + children.get(myIndex - 1);
            zk.exists(watchNode, this);  // Set watch
            System.out.println("Following. Watching: " + watchNode);
        }
    }

    @Override
    public void process(WatchedEvent event) {
        if (event.getType() == Event.EventType.NodeDeleted) {
            try { checkLeadership(); }
            catch (Exception e) { e.printStackTrace(); }
        }
    }

    private void doLeaderWork() { /* leader logic */ }
}
